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
};

export type MunicipalityTemplate = {
  code: string;
  label: string;
  csvHeaders: string[];
  csvRow: (view: WageSlipView) => string[];
  pdfLines: (view: WageSlipView) => string[];
};

const BASE_CSV_HEADERS = [
  '明細ID',
  '自治体様式',
  '事業所名',
  '利用者ID',
  '利用者名',
  '対象月',
  '締日',
  '総労働時間',
  '時給',
  '総支給額',
  '控除額',
  '差引支給額',
  'ステータス',
  '備考',
  '承認者ID',
  '発行日時',
];

function createTemplate(code: string, label: string, prefectureName: string): MunicipalityTemplate {
  return {
    code,
    label,
    csvHeaders: BASE_CSV_HEADERS,
    csvRow: (view) => [
      view.slipId,
      prefectureName,
      view.organizationName,
      view.serviceUserId,
      view.serviceUserName,
      view.month,
      view.closingDate,
      view.totalHours.toString(),
      view.hourlyRate.toString(),
      view.grossAmount.toString(),
      view.deductions.toString(),
      view.netAmount.toString(),
      view.statusLabel,
      view.remarks,
      view.approverId,
      view.issuedAt,
    ],
    pdfLines: (view) => [
      'WAGE SLIP STATEMENT',
      `自治体様式: ${prefectureName}（MVP）`,
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
      '------------------------------------------',
      `Status         : ${view.statusLabel}`,
      `Remarks        : ${view.remarks}`,
      `Approver ID    : ${view.approverId || '-'}`,
      'Approval Stamp : [                           ]',
      'Checked By     : [                           ]',
    ],
  };
}

const fukuokaTemplate: MunicipalityTemplate = createTemplate('fukuoka', '福岡県様式（MVP）', '福岡県');
const kumamotoTemplate: MunicipalityTemplate = createTemplate('kumamoto', '熊本県様式（MVP）', '熊本県');
const sagaTemplate: MunicipalityTemplate = createTemplate('saga', '佐賀県様式（MVP）', '佐賀県');

const templates: Record<string, MunicipalityTemplate> = {
  fukuoka: fukuokaTemplate,
  kumamoto: kumamotoTemplate,
  saga: sagaTemplate,
};

export function listMunicipalityTemplates(): Array<{ code: string; label: string }> {
  return Object.values(templates).map((template) => ({ code: template.code, label: template.label }));
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
