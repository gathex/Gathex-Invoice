import { supabase } from "../supabase/config";
import { SalesDocType, InvoiceItem } from "../types";
import { salesDocumentService } from "../services/salesDocumentService";

export const STATES_LIST = [
  "Andhra Pradesh (37)", "Arunachal Pradesh (12)", "Assam (18)", "Bihar (10)", "Chhattisgarh (22)",
  "Delhi (07)", "Goa (30)", "Gujarat (24)", "Haryana (06)", "Himachal Pradesh (02)", "Jammu & Kashmir (01)",
  "Jharkhand (20)", "Karnataka (29)", "Kerala (32)", "Madhya Pradesh (23)", "Maharashtra (27)", "Manipur (14)",
  "Meghalaya (17)", "Mizoram (15)", "Nagaland (13)", "Odisha (21)", "Punjab (03)", "Rajasthan (08)",
  "Sikkim (11)", "Tamil Nadu (33)", "Telangana (36)", "Tripura (16)", "Uttar Pradesh (09)", "Uttarakhand (05)",
  "West Bengal (19)"
];

/**
 * Returns Indian Financial Year string, e.g. "2026-27"
 */
export function getFY(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = d.getMonth(); // 0-based: 0 = Jan, 3 = April
  const startYear = month >= 3 ? year : year - 1;
  const endYearShort = String((startYear + 1) % 100).padStart(2, "0");
  return `${startYear}-${endYearShort}`;
}

/**
 * Finds next document number in format PREFIX/FY/NNN (e.g. QT/2026-27/001).
 * Next = highest existing for business_id + doc_type, plus 1.
 */
export async function getNextDocNumber(
  businessId: string,
  docType: SalesDocType,
  prefix: string,
  date: Date = new Date()
): Promise<string> {
  const fy = getFY(date);
  const prefixPattern = `${prefix}/${fy}/`;

  try {
    const { data, error } = await supabase
      .from("sales_documents")
      .select("doc_number")
      .eq("business_id", businessId)
      .eq("doc_type", docType);

    if (error) {
      console.error("Error fetching documents for numbering:", error);
      return `${prefixPattern}001`;
    }

    let maxNum = 0;
    (data || []).forEach((row: { doc_number: string }) => {
      const num = row.doc_number || "";
      if (num.startsWith(prefixPattern)) {
        const parts = num.split("/");
        const lastPart = parts[parts.length - 1];
        const val = parseInt(lastPart, 10);
        if (!isNaN(val) && val > maxNum) {
          maxNum = val;
        }
      } else if (num.includes(`/${fy}/`)) {
        const parts = num.split("/");
        const lastPart = parts[parts.length - 1];
        const val = parseInt(lastPart, 10);
        if (!isNaN(val) && val > maxNum) {
          maxNum = val;
        }
      }
    });

    const nextVal = maxNum + 1;
    return `${prefixPattern}${String(nextVal).padStart(3, "0")}`;
  } catch (err) {
    console.error("Failed to compute next doc number:", err);
    return `${prefixPattern}001`;
  }
}

/**
 * DB has UNIQUE (business_id, doc_type, doc_number);
 * On duplicate error (23505), re-fetch next number and retry once.
 */
export async function saveDocumentWithRetry(
  docPayload: Record<string, any>,
  items: (Partial<InvoiceItem> & { name: string; price: number; quantity: number })[] | InvoiceItem[],
  prefix: string,
  maxRetries: number = 1
): Promise<{ document: any; error: any }> {
  let attempt = 0;
  let currentPayload = { ...docPayload };

  while (attempt <= maxRetries) {
    const { data, error } = await supabase
      .from("sales_documents")
      .insert([currentPayload])
      .select()
      .single();

    if (!error && data) {
      if (items && items.length > 0) {
        await salesDocumentService.saveDocumentItems(data.id, items as any);
      }
      return { document: data, error: null };
    }

    const isDuplicate =
      error?.code === "23505" ||
      error?.message?.toLowerCase().includes("duplicate") ||
      error?.message?.toLowerCase().includes("unique");

    if (isDuplicate && attempt < maxRetries) {
      attempt++;
      console.warn(
        `Duplicate doc_number detected (${currentPayload.doc_number}). Re-fetching next number (Attempt ${attempt}/${maxRetries})...`
      );
      const newNum = await getNextDocNumber(
        currentPayload.business_id,
        currentPayload.doc_type,
        prefix,
        currentPayload.issue_date ? new Date(currentPayload.issue_date) : new Date()
      );
      currentPayload.doc_number = newNum;
      continue;
    }

    return { document: null, error };
  }

  return { document: null, error: new Error("Failed to save document after retry.") };
}

/**
 * Normalizes any state name into the STATES_LIST item format (e.g. "Tamil Nadu" -> "Tamil Nadu (33)")
 */
export function matchStateInList(rawState: string | undefined): string {
  if (!rawState) return "Tamil Nadu (33)";
  const clean = rawState.trim().toLowerCase();

  // 1. Direct match
  const exact = STATES_LIST.find((s) => s.toLowerCase() === clean);
  if (exact) return exact;

  // 2. Match without code suffix e.g. "tamil nadu" in "Tamil Nadu (33)"
  const byName = STATES_LIST.find((s) => {
    const baseName = s.split(" (")[0].toLowerCase();
    return baseName === clean || clean.includes(baseName) || baseName.includes(clean);
  });
  if (byName) return byName;

  // 3. Match by 2-digit code in parentheses or start
  const codeMatch = rawState.match(/\b(\d{2})\b/);
  if (codeMatch) {
    const byCode = STATES_LIST.find((s) => s.includes(`(${codeMatch[1]})`));
    if (byCode) return byCode;
  }

  return STATES_LIST.find((s) => s.startsWith("Tamil Nadu")) || STATES_LIST[0];
}

/**
 * Default = business state. If a saved customer is selected, default to the customer's state.
 * For "Custom Client / Retail Spot Cash", default to business state (user can change).
 */
export function defaultPlaceOfSupply(
  businessState: string | undefined,
  customerState: string | undefined,
  isCustomCustomer: boolean = false
): string {
  const fallbackBusinessState = matchStateInList(businessState || "Tamil Nadu (33)");

  if (isCustomCustomer || !customerState) {
    return fallbackBusinessState;
  }

  return matchStateInList(customerState);
}

/**
 * Returns tax classification badge text:
 * "Intra-state: CGST + SGST" or "Inter-state: IGST"
 */
export function taxHint(
  placeOfSupply: string | undefined,
  businessState: string | undefined
): string {
  if (!placeOfSupply) return "Intra-state: CGST + SGST";

  const posNormalized = matchStateInList(placeOfSupply);
  const bizNormalized = matchStateInList(businessState || "Tamil Nadu (33)");

  const posCodeMatch = posNormalized.match(/\((\d{2})\)/);
  const bizCodeMatch = bizNormalized.match(/\((\d{2})\)/);

  if (posCodeMatch && bizCodeMatch && posCodeMatch[1] === bizCodeMatch[1]) {
    return "Intra-state: CGST + SGST";
  }

  const posName = posNormalized.split(" (")[0].trim().toLowerCase();
  const bizName = bizNormalized.split(" (")[0].trim().toLowerCase();

  if (posName === bizName) {
    return "Intra-state: CGST + SGST";
  }

  return "Inter-state: IGST";
}
