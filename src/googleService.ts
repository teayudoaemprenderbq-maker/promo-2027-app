const GAS_URL = 'https://script.google.com/macros/s/AKfycbyHJSp3HQAdya9yYveH4qctCD2Snvpvlg4m2AbdHL7t3UhziE6kGEpFZ6X4OKyeXQB1Jg/exec';

export const fetchSheetData = async (action: string) => {
  try {
    const response = await fetch(`${GAS_URL}?action=${action}`);
    const result = await response.json();
    if (result.status === 'error') throw new Error(result.message);
    return result.data;
  } catch (error) {
    console.error(`Error al obtener ${action}:`, error);
    throw error;
  }
};

export const postData = async (action: string, payload: any) => {
  try {
    const response = await fetch(GAS_URL, {
      method: 'POST',
      body: JSON.stringify({ action, ...payload }),
      headers: {
        // Usar text/plain evita problemas de pre-flight CORS en Google Apps Script
        'Content-Type': 'text/plain;charset=utf-8',
      },
    });
    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Error en postData:", error);
    throw error;
  }
};
