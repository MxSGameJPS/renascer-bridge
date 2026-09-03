const DELIVERY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const DELIVERY_PATTERN = new RegExp(`^DV[${DELIVERY_ALPHABET}]{8}$`);
const COMMAND_PATTERN = /^C([1-9][0-9]{0,11})$/;
const NUMERIC_COMMAND_PATTERN = /^[0-9]{1,12}$/;

export function normalizeBridgeCode(value) {
  const normalized = String(value ?? "").trim().toUpperCase();

  if (NUMERIC_COMMAND_PATTERN.test(normalized)) {
    const commandNumber = normalized.replace(/^0+/, "");
    return commandNumber ? `C${commandNumber}` : normalized;
  }

  return normalized;
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
