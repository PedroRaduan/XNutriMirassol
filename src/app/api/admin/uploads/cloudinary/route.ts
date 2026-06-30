import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { cloudinary, getCloudinaryFolder } from "@/lib/cloudinary";
import { rateLimit } from "@/lib/security/rate-limit";
import { getClientIp } from "@/lib/security/request";

export const runtime = "nodejs";
const maxImageSize = 4 * 1024 * 1024;
const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

export async function POST(request: Request) {
  await requireAdmin();
  const ip = await getClientIp();
  const limited = rateLimit(`upload:${ip}`, 20, 60_000);

  if (!limited.ok) {
    return NextResponse.json({ error: "Rate limit excedido." }, { status: 429 });
  }

  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    return NextResponse.json({ error: "Cloudinary não configurado." }, { status: 503 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Arquivo não enviado." }, { status: 400 });
  }

  if (!allowedImageTypes.has(file.type)) {
    return NextResponse.json({ error: "Envie uma imagem JPG, PNG, WebP ou AVIF." }, { status: 400 });
  }

  if (file.size > maxImageSize) {
    return NextResponse.json({ error: "A imagem deve ter no máximo 4 MB." }, { status: 413 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const dataUri = `data:${file.type};base64,${buffer.toString("base64")}`;
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: getCloudinaryFolder(),
      resource_type: "image",
      overwrite: false,
      use_filename: true,
      unique_filename: true,
    });

    return NextResponse.json({
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
    });
  } catch (error) {
    console.error("Falha no upload para o Cloudinary", error);
    return NextResponse.json({ error: "Não foi possível enviar a imagem. Confira a configuração do Cloudinary." }, { status: 502 });
  }
}
