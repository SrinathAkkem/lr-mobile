import { Paths, File } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Alert } from "react-native";
import { API_URL, getToken } from "./api";

/**
 * Download a PDF with auth, save to device cache, and open the share sheet.
 */
export async function downloadAndSharePdf(lrId: string, filename?: string) {
  const token = await getToken();
  if (!token) {
    Alert.alert("Not logged in", "Please log in to download PDFs.");
    return;
  }

  const url = `${API_URL}/api/lr/${lrId}/pdf`;
  const safeName = (filename ?? lrId).replace(/\//g, "-");

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => null);
      Alert.alert(
        "Download failed",
        errBody?.error ?? `Server returned ${res.status}`,
      );
      return;
    }

    const arrayBuf = await res.arrayBuffer();
    const bytes = new Uint8Array(arrayBuf);

    const file = new File(Paths.cache, `${safeName}.pdf`);
    if (file.exists) file.delete();
    file.create();
    file.write(bytes);

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(file.uri, {
        mimeType: "application/pdf",
        dialogTitle: `Share ${safeName}`,
        UTI: "com.adobe.pdf",
      });
    } else {
      Alert.alert("Downloaded", "PDF saved successfully.");
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    Alert.alert("Download error", msg);
  }
}
