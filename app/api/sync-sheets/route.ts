import { NextResponse } from "next/server";
import { google } from "googleapis";

// Helper to format currency
function formatVND(n: number) {
  return n.toLocaleString("vi-VN") + "đ";
}

// Helper to format date
function formatDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

export async function POST(req: Request) {
  try {
    const project = await req.json();

    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY;
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    // Check if configuration is present. If not, bypass sync gracefully to prevent crashing
    if (!clientEmail || !privateKey || !spreadsheetId) {
      console.warn("Google Sheets credentials are not fully configured in env.");
      return NextResponse.json({ 
        success: false, 
        message: "Google Sheets credentials are missing in env. Synchronization bypassed." 
      });
    }

    // Authenticate with Google
    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"]
    });

    const sheets = google.sheets({ version: "v4", auth });

    // Fetch existing sheets headers/data to find matching row
    const getRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Sheet1!A:J",
    });

    const rows = getRes.data.values || [];
    let headerRowIndex = 0;
    
    // If sheet is completely empty, initialize it with headers first
    if (rows.length === 0) {
      const headers = ["ID", "Tên Khách hàng", "Số điện thoại", "Dịch vụ", "Trạng thái", "Giá trị", "Đã thu", "Ngày tạo", "Hạn chót", "Cập nhật cuối"];
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: "Sheet1!A1",
        valueInputOption: "RAW",
        requestBody: { values: [headers] },
      });
      rows.push(headers);
    }

    // Find if the project ID exists in the sheet
    // Assumes project.id is at index 0 (Column A)
    let matchedRowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === project.id) {
        matchedRowIndex = i + 1; // 1-indexed, sheet rows start at 1
        break;
      }
    }

    // Prepare row values
    const newValues = [
      project.id,
      project.customer_name || "—",
      project.customer_phone || "—",
      project.service_type || "—",
      project.status || "Đang chờ",
      project.total_amount ? formatVND(Number(project.total_amount)) : "0đ",
      project.paid_amount ? formatVND(Number(project.paid_amount)) : "0đ",
      formatDate(project.created_at),
      formatDate(project.due_date),
      new Date().toLocaleString("vi-VN"),
    ];

    if (matchedRowIndex !== -1) {
      // Update existing row
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `Sheet1!A${matchedRowIndex}:J${matchedRowIndex}`,
        valueInputOption: "RAW",
        requestBody: { values: [newValues] },
      });
      console.log(`Successfully updated row ${matchedRowIndex} for project: ${project.customer_name}`);
    } else {
      // Append a new row
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: "Sheet1!A:J",
        valueInputOption: "RAW",
        requestBody: { values: [newValues] },
      });
      console.log(`Successfully appended new row for project: ${project.customer_name}`);
    }

    return NextResponse.json({ success: true, message: "Sync successful" });
  } catch (error: any) {
    console.error("Google Sheets sync failed:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
