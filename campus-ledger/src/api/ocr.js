// src/api/ocr.js
export async function uploadReceipt(file) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("http://localhost:8000/extract/", {
    method: "POST",
    body: formData,
  });

  return res.json();
}

export async function uploadCSV(file) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("http://localhost:8000/upload-csv/", {
    method: "POST",
    body: formData,
  });

  return res.json();
}
