// ============================================================
//  GOOGLE APPS SCRIPT — REST API Backend (Updated for Leaves)
// ============================================================

function doGet(e) {
  const action = e.parameter.action;
  let result;

  if (action === 'getConfig') {
    result = getConfig();
  } else if (action === 'getKnownFaces') {
    result = getKnownFaces();
  } else {
    result = { error: 'Unknown action: ' + action };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  let data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: 'Invalid JSON body' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const action = data.action;
  let result;

  if (action === 'registerUser') {
    result = registerUser(data.name, data.faceDescriptor);
  } else if (action === 'logAttendance') {
    // เพิ่ม parameter data.type เพื่อแยก เข้างาน/ออกงาน/พัก
    result = logAttendance(data.name, data.lat, data.lng, data.type);
  } else if (action === 'saveConfig') {
    result = saveConfig(data.lat, data.lng, data.radius);
  } else if (action === 'submitLeave') {
    // --- ส่วนที่แก้ไขเพิ่ม: รองรับการส่งใบลา ---
    result = submitLeave(data.name, data.startDate, data.endDate, data.leaveType, data.reason);
  } else {
    result = { error: 'Unknown action: ' + action };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * ฟังก์ชันบันทึกการลาหยุด
 */
function submitLeave(name, startDate, endDate, leaveType, reason) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Leaves');
  
  // ถ้ายังไม่มี Sheet "Leaves" ให้สร้างใหม่พร้อมหัวข้อ
  if (!sheet) {
    sheet = ss.insertSheet('Leaves');
    sheet.appendRow(['วันเวลาที่ส่ง', 'ชื่อพนักงาน', 'วันที่เริ่มลา', 'วันที่สิ้นสุด', 'ประเภทการลา', 'เหตุผล/หมายเหตุ', 'สถานะ']);
    sheet.setFrozenRows(1);
    sheet.getRange("A1:G1").setBackground("#f3f3f3").setFontWeight("bold");
  }

  const now = new Date();
  sheet.appendRow([
    now,
    name,
    startDate,
    endDate,
    leaveType,
    reason || '-',
    'รอดำเนินการ' // สถานะเริ่มต้น
  ]);

  return { success: true, message: 'บันทึกข้อมูลการลาเรียบร้อยแล้ว' };
}

// --- ฟังก์ชันเดิมอื่นๆ (logAttendance, registerUser, etc.) คงไว้ตามเดิม ---
function logAttendance(name, lat, lng, type) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Attendance');
  if (!sheet) {
    sheet = ss.insertSheet('Attendance');
    sheet.appendRow(['ชื่อ', 'เวลา', 'วันที่', 'Lat', 'Lng', 'ประเภท', 'Link แผนที่']);
  }

  const now = new Date();
  const dateStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const timeStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'HH:mm:ss');
  const mapLink = `https://www.google.com/maps?q=${lat},${lng}`;

  sheet.appendRow([
    name,
    timeStr,
    "'" + dateStr,
    lat || '-',
    lng || '-',
    type || 'เข้างาน',
    mapLink
  ]);
  return { success: true, message: 'บันทึกเวลาสำเร็จ (' + (type || 'เข้างาน') + ')' };
}

function saveConfig(lat, lng, radius) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Config');
  if (!sheet) {
    sheet = ss.insertSheet('Config');
    sheet.getRange('A1:B1').setValues([['Parameter', 'Value']]);
    sheet.getRange('A2').setValue('Target Latitude');
    sheet.getRange('A3').setValue('Target Longitude');
    sheet.getRange('A4').setValue('Allowed Radius (KM)');
  }
  sheet.getRange('B2').setValue(lat);
  sheet.getRange('B3').setValue(lng);
  sheet.getRange('B4').setValue(radius);
  return { success: true, message: 'บันทึกการตั้งค่าเรียบร้อย' };
}

function getConfig() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Config');
  if (sheet) {
    return {
      lat: sheet.getRange('B2').getValue(),
      lng: sheet.getRange('B3').getValue(),
      radius: sheet.getRange('B4').getValue()
    };
  }
  return { lat: 0, lng: 0, radius: 0.5 };
}

function registerUser(name, descriptor) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Users');
  if (!sheet) {
    sheet = ss.insertSheet('Users');
    sheet.appendRow(['Name', 'Descriptor']);
  }
  sheet.appendRow([name, JSON.stringify(descriptor)]);
  return { success: true, message: 'ลงทะเบียนสำเร็จ' };
}

function getKnownFaces() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Users');
  if (!sheet) return { users: [] };
  const data = sheet.getDataRange().getValues();
  const users = [];
  for (let i = 1; i < data.length; i++) {
    users.push({
      name: data[i][0],
      descriptor: JSON.parse(data[i][1])
    });
  }
  return { users: users };
}