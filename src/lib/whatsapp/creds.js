import { decryptSecret } from "@/lib/utils/secret";
export function getWaCreds(store) {
    if (!store.waPhoneNumberId || !store.waAccessToken)
        return null;
    return { phoneNumberId: store.waPhoneNumberId, accessToken: decryptSecret(store.waAccessToken) };
}
