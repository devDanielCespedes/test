import fetch from "node-fetch";
import fs from "fs";

export async function downloadResource(resourceUrl, destination) {
  try {
    const response = await fetch(resourceUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(destination, buffer);
  } catch (error) {
    console.error(`Failed to download ${resourceUrl}: ${error.message}`);
  }
}
