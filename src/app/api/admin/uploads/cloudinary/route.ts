import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { cloudinary, getCloudinaryFolder } from "@/lib/cloudinary";
import { rateLimit } from "@/lib/security/rate-limit";
import { assertSameOrigin, getClientIp } from "@/lib/security/request";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";
const maxImageSize = 4 * 1024 * 1024;
const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

function matchesImageSignature(buffer: Buffer, mimeType: string) {
  if (mimeType === "image/jpeg") return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mimeType === "image/png") return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (mimeType === "image/webp") return buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
  if (mimeType === "image/avif") {
    const brand = buffer.subarray(8, 12).toString("ascii");
    return buffer.subarray(4, 8).toString("ascii") === "ftyp" && ["avif", "avis"].includes(brand);
  }
  return false;
}

export async function POST(request: Request) {
  await assertSameOrigin();
  const admin = await requireAdmin("content", true);
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
    if (!matchesImageSignature(buffer, file.type)) {
      return NextResponse.json({ error: "O conteúdo do arquivo não corresponde a uma imagem válida." }, { status: 400 });
    }
    const dataUri = `data:${file.type};base64,${buffer.toString("base64")}`;
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: getCloudinaryFolder(),
      resource_type: "image",
      allowed_formats: ["jpg", "jpeg", "png", "webp", "avif"],
      overwrite: false,
      use_filename: false,
      unique_filename: true,
    });

    await prisma.auditLog.create({
      data: {
        adminUserId: admin.admin.id,
        action: "image.upload",
        entity: "media",
        entityId: result.public_id,
        ipAddress: ip,
        metadata: { width: result.width, height: result.height, format: result.format },
      },
    }).catch(() => undefined);

    return NextResponse.json({
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
    });
  } catch (error) {
    console.error("Falha no upload para o Cloudinary", {
      message: error instanceof Error ? error.message : "erro desconhecido",
    });
    return NextResponse.json({ error: "Não foi possível enviar a imagem. Confira a configuração do Cloudinary." }, { status: 502 });
  }
}
