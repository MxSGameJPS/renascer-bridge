const DELIVERY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const DELIVERY_PATTERN = new RegExp(`^DV[${DELIVERY_ALPHABET}]{8}$`);
const COMMAND_PATTERN = /^C([1-9][0-9]{0,17})$/;

export function normalizeBridgeCode(value) {
  return String(value ?? "").trim().toUpperCase();
}

export function classifyBridgeCode(value) {
  const normalized = normalizeBridgeCode(value);

  const commandMatch = normalized.match(COMMAND_PATTERN);
  if (commandMatch) {
    return {
      recognized: true,
      type: "command",
      code: normalized,
      orderNumber: commandMatch[1],
    };
  }

  if (DELIVERY_PATTERN.test(normalized)) {
    return {
      recognized: true,
      type: "delivery",
      code: normalized,
      deliveryCode: normalized,
    };
  }

  return {
    recognized: false,
    type: "external",
    code: normalized,
  };
}
