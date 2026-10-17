import { assertEquals } from "@std/assert";
import { isValidMetaSignature, signMetaBody } from "./meta-signature.ts";

const body = '{"object":"whatsapp_business_account","entry":[]}';

Deno.test("isValidMetaSignature acepta la firma del mismo secret", async () => {
  const sig = await signMetaBody(body, "secreto");
  assertEquals(await isValidMetaSignature(body, sig, "secreto"), true);
});

Deno.test("isValidMetaSignature rechaza otro secret, body alterado o sin header", async () => {
  const sig = await signMetaBody(body, "secreto");
  assertEquals(await isValidMetaSignature(body, sig, "otro"), false);
  assertEquals(await isValidMetaSignature(body + " ", sig, "secreto"), false);
  assertEquals(await isValidMetaSignature(body, null, "secreto"), false);
  assertEquals(await isValidMetaSignature(body, sig, undefined), false);
});
