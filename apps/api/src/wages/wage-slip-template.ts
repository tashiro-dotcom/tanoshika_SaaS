export type WageSlipView = {
  slipId: string;
  organizationId: string;
  organizationName: string;
  serviceUserId: string;
  serviceUserName: string;
  month: string;
  closingDate: string;
  totalHours: number;
  hourlyRate: number;
  grossAmount: number;
  deductions: number;
  netAmount: number;
  status: string;
  statusLabel: string;
  remarks: string;
  approverId: string;
  issuedAt: string;
  dayStatusSummary: {
    standardDailyHours: number;
    actualWorkedHours: number;
    adjustedHours: number;
    deltaHours: number;
    counts: {
      present: number;
      absent: number;
      paid_leave: number;
      scheduled_holiday: number;
      special_leave: number;
    };
  };
};

export type MunicipalityTemplate = {
  code: string;
  label: string;
  note: string;
  csvHeaders: string[];
  csvRow: (view: WageSlipView) => string[];
  pdfLines: (view: WageSlipView) => string[];
};

type CsvFieldKey =
  | 'slipId'
  | 'templateName'
  | 'organizationName'
  | 'serviceUserId'
  | 'serviceUserName'
  | 'month'
  | 'closingDate'
  | 'totalHours'
  | 'hourlyRate'
  | 'grossAmount'
  | 'deductions'
  | 'netAmount'
  | 'actualWorkedHours'
  | 'adjustedHours'
  | 'deltaHours'
  | 'paidLeaveCount'
  | 'absentCount'
  | 'scheduledHolidayCount'
  | 'specialLeaveCount'
  | 'statusLabel'
  | 'remarks'
  | 'approverId'
  | 'issuedAt'
  | 'templateNote';

type TemplateDefinition = {
  code: string;
  label: string;
  note: string;
  columns: Array<{ key: CsvFieldKey; header: string }>;
  pdfTitle: string;
};

function csvCellValue(view: WageSlipView, key: CsvFieldKey, templateLabel: string, templateNote: string): string {
  switch (key) {
    case 'slipId':
      return view.slipId;
    case 'templateName':
      return templateLabel;
    case 'organizationName':
      return view.organizationName;
    case 'serviceUserId':
      return view.serviceUserId;
    case 'serviceUserName':
      return view.serviceUserName;
    case 'month':
      return view.month;
    case 'closingDate':
      return view.closingDate;
    case 'totalHours':
      return view.totalHours.toString();
    case 'hourlyRate':
      return view.hourlyRate.toString();
    case 'grossAmount':
      return view.grossAmount.toString();
    case 'deductions':
      return view.deductions.toString();
    case 'netAmount':
      return view.netAmount.toString();
    case 'actualWorkedHours':
      return view.dayStatusSummary.actualWorkedHours.toString();
    case 'adjustedHours':
      return view.dayStatusSummary.adjustedHours.toString();
    case 'deltaHours':
      return view.dayStatusSummary.deltaHours.toString();
    case 'paidLeaveCount':
      return view.dayStatusSummary.counts.paid_leave.toString();
    case 'absentCount':
      return view.dayStatusSummary.counts.absent.toString();
    case 'scheduledHolidayCount':
      return view.dayStatusSummary.counts.scheduled_holiday.toString();
    case 'specialLeaveCount':
      return view.dayStatusSummary.counts.special_leave.toString();
    case 'statusLabel':
      return view.statusLabel;
    case 'remarks':
      return view.remarks;
    case 'approverId':
      return view.approverId;
    case 'issuedAt':
      return view.issuedAt;
    case 'templateNote':
      return templateNote;
    default: {
      const exhaustive: never = key;
      return exhaustive;
    }
  }
}

function createTemplate(definition: TemplateDefinition): MunicipalityTemplate {
  return {
    code: definition.code,
    label: definition.label,
    note: definition.note,
    csvHeaders: definition.columns.map((column) => column.header),
    csvRow: (view) => [
      ...definition.columns.map((column) => csvCellValue(view, column.key, definition.label, definition.note)),
    ],
    pdfLines: (view) => [
      definition.pdfTitle,
      `自治体様式: ${definition.label}`,
      `注記: ${definition.note}`,
      '------------------------------------------',
      `Issued At: ${view.issuedAt}`,
      `Organization: ${view.organizationName} (${view.organizationId})`,
      `Slip ID: ${view.slipId}`,
      `Service User: ${view.serviceUserName} (${view.serviceUserId})`,
      `Target Month: ${view.month}`,
      `Closing Date: ${view.closingDate}`,
      '------------------------------------------',
      'PAYMENT BREAKDOWN',
      `Total Hours    : ${formatHours(view.totalHours)} h`,
      `Hourly Rate    : ${formatYen(view.hourlyRate)}`,
      `Gross Amount   : ${formatYen(view.grossAmount)}`,
      `Deductions     : ${formatYen(view.deductions)}`,
      `Net Amount     : ${formatYen(view.netAmount)}`,
      `Actual Hours   : ${formatHours(view.dayStatusSummary.actualWorkedHours)} h`,
      `Adjusted Hours : ${formatHours(view.dayStatusSummary.adjustedHours)} h`,
      `Delta Hours    : ${formatHours(view.dayStatusSummary.deltaHours)} h`,
      `Paid Leave Cnt : ${view.dayStatusSummary.counts.paid_leave}`,
      `Absent Cnt     : ${view.dayStatusSummary.counts.absent}`,
      `Holiday Cnt    : ${view.dayStatusSummary.counts.scheduled_holiday}`,
      `Special Lv Cnt : ${view.dayStatusSummary.counts.special_leave}`,
      '------------------------------------------',
      `Status         : ${view.statusLabel}`,
      `Remarks        : ${view.remarks}`,
      `Approver ID    : ${view.approverId || '-'}`,
      'Approval Stamp : [                           ]',
      'Checked By     : [                           ]',
    ],
  };
}

const fukuokaTemplate: MunicipalityTemplate = createTemplate({
  code: 'fukuoka',
  label: '福岡県様式（MVP）',
  note: '福岡県運用注記: 時間内訳（実績/反映/差分）を末尾に記載',
  pdfTitle: 'WAGE SLIP STATEMENT (FUKUOKA)',
  columns: [
    { key: 'slipId', header: '明細ID' },
    { key: 'templateName', header: '自治体様式' },
    { key: 'organizationName', header: '事業所名' },
    { key: 'serviceUserId', header: '利用者ID' },
    { key: 'serviceUserName', header: '利用者名' },
    { key: 'month', header: '対象月' },
    { key: 'closingDate', header: '締日' },
    { key: 'totalHours', header: '総労働時間' },
    { key: 'hourlyRate', header: '時給' },
    { key: 'grossAmount', header: '総支給額' },
    { key: 'deductions', header: '控除額' },
    { key: 'netAmount', header: '差引支給額' },
    { key: 'actualWorkedHours', header: '実績時間' },
    { key: 'adjustedHours', header: '反映時間' },
    { key: 'deltaHours', header: '時間差分' },
    { key: 'paidLeaveCount', header: '有給件数' },
    { key: 'absentCount', header: '欠勤件数' },
    { key: 'scheduledHolidayCount', header: '所定休日件数' },
    { key: 'specialLeaveCount', header: '特休件数' },
    { key: 'statusLabel', header: 'ステータス' },
    { key: 'remarks', header: '備考' },
    { key: 'approverId', header: '承認者ID' },
    { key: 'issuedAt', header: '発行日時' },
    { key: 'templateNote', header: '様式注記' },
  ],
});

const kumamotoTemplate: MunicipalityTemplate = createTemplate({
  code: 'kumamoto',
  label: '熊本県様式（MVP）',
  note: '熊本県運用注記: 金額欄を先行表示し、利用者情報は後半に記載',
  pdfTitle: 'WAGE SLIP STATEMENT (KUMAMOTO)',
  columns: [
    { key: 'templateName', header: '様式区分' },
    { key: 'slipId', header: '明細番号' },
    { key: 'month', header: '支給対象月' },
    { key: 'grossAmount', header: '支給総額' },
    { key: 'deductions', header: '控除合計' },
    { key: 'netAmount', header: '差引支給額' },
    { key: 'hourlyRate', header: '時間単価' },
    { key: 'totalHours', header: '総労働時間' },
    { key: 'adjustedHours', header: '換算労働時間' },
    { key: 'actualWorkedHours', header: '実労働時間' },
    { key: 'deltaHours', header: '換算差分時間' },
    { key: 'serviceUserId', header: '利用者番号' },
    { key: 'serviceUserName', header: '利用者氏名' },
    { key: 'organizationName', header: '事業所名' },
    { key: 'closingDate', header: '締日' },
    { key: 'paidLeaveCount', header: '有給日数' },
    { key: 'absentCount', header: '欠勤日数' },
    { key: 'scheduledHolidayCount', header: '所定休日数' },
    { key: 'specialLeaveCount', header: '特休日数' },
    { key: 'statusLabel', header: '確定状態' },
    { key: 'approverId', header: '承認担当者ID' },
    { key: 'issuedAt', header: '出力日時' },
    { key: 'remarks', header: '備考' },
    { key: 'templateNote', header: '様式注記' },
  ],
});

const sagaTemplate: MunicipalityTemplate = createTemplate({
  code: 'saga',
  label: '佐賀県様式（MVP）',
  note: '佐賀県運用注記: 日別区分件数を先頭集計欄として表示',
  pdfTitle: 'WAGE SLIP STATEMENT (SAGA)',
  columns: [
    { key: 'templateName', header: '自治体様式' },
    { key: 'month', header: '対象月' },
    { key: 'organizationName', header: '事業所名' },
    { key: 'serviceUserName', header: '利用者名' },
    { key: 'serviceUserId', header: '利用者ID' },
    { key: 'paidLeaveCount', header: '有給件数' },
    { key: 'absentCount', header: '欠勤件数' },
    { key: 'scheduledHolidayCount', header: '所定休日件数' },
    { key: 'specialLeaveCount', header: '特休件数' },
    { key: 'actualWorkedHours', header: '実績時間' },
    { key: 'adjustedHours', header: '反映時間' },
    { key: 'deltaHours', header: '時間差分' },
    { key: 'hourlyRate', header: '時給' },
    { key: 'grossAmount', header: '総支給額' },
    { key: 'deductions', header: '控除額' },
    { key: 'netAmount', header: '差引支給額' },
    { key: 'statusLabel', header: 'ステータス' },
    { key: 'remarks', header: '備考' },
    { key: 'approverId', header: '承認者ID' },
    { key: 'closingDate', header: '締日' },
    { key: 'issuedAt', header: '発行日時' },
    { key: 'slipId', header: '明細ID' },
    { key: 'totalHours', header: '総労働時間' },
    { key: 'templateNote', header: '様式注記' },
  ],
});

const templates: Record<string, MunicipalityTemplate> = {
  fukuoka: fukuokaTemplate,
  kumamoto: kumamotoTemplate,
  saga: sagaTemplate,
};

export function listMunicipalityTemplates(): Array<{ code: string; label: string; note: string }> {
  return Object.values(templates).map((template) => ({ code: template.code, label: template.label, note: template.note }));
}

export function getMunicipalityTemplate(code?: string): MunicipalityTemplate {
  const sourceCode = (code || process.env.MUNICIPALITY_TEMPLATE || 'fukuoka').toLowerCase();
  return templates[sourceCode] || fukuokaTemplate;
}

/*
 * Backward-compatible alias for existing call sites.
 */
export function getMunicipalityTemplateFromEnv(): MunicipalityTemplate {
  return getMunicipalityTemplate();
}

function formatYen(value: number): string {
  return `JPY ${value.toLocaleString('en-US')}`;
}

function formatHours(value: number): string {
  return Number(value.toFixed(2)).toString();
}
