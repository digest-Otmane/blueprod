/**
 * Helper to trigger native browser print preview dialog directly
 * without opening intermediate preview tabs or pages.
 */
let isPrintingLock = false;

export function printDocumentDirectly(url: string): void {
  if (typeof window === "undefined") return;
  if (isPrintingLock) return;
  isPrintingLock = true;

  // Remove any previous print iframe
  const existingIframe = document.getElementById("crm-print-frame") as HTMLIFrameElement | null;
  if (existingIframe) {
    existingIframe.remove();
  }

  const iframe = document.createElement("iframe");
  iframe.id = "crm-print-frame";
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.visibility = "hidden";
  iframe.src = url;

  let hasExecuted = false;

  const triggerSinglePrint = () => {
    if (hasExecuted) return;
    hasExecuted = true;

    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (err) {
      console.warn("Direct iframe printing error", err);
    } finally {
      setTimeout(() => {
        isPrintingLock = false;
      }, 1000);
    }
  };

  iframe.onload = () => {
    setTimeout(triggerSinglePrint, 200);
  };

  document.body.appendChild(iframe);
}

