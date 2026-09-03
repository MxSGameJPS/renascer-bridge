import test from "node:test";
import assert from "node:assert/strict";
import { classifyBridgeCode } from "./code-parser.js";

test("reconhece comanda com prefixo C", () => {
  assert.deepEqual(classifyBridgeCode("C105"), {
    recognized: true,
    type: "command",
    code: "C105",
    orderNumber: "105",
  });
});

test("normaliza comanda em minúsculas", () => {
  assert.equal(classifyBridgeCode(" c27 ").code, "C27");
});

test("aceita número puro como comanda física", () => {
  assert.deepEqual(classifyBridgeCode("105"), {
    recognized: true,
    type: "command",
    code: "C105",
    orderNumber: "105",
  });
});

test("remove zeros à esquerda da comanda digitada", () => {
  assert.equal(classifyBridgeCode("00105").code, "C105");
});

test("reconhece delivery no alfabeto seguro", () => {
  assert.equal(classifyBridgeCode("DV7K3M9Q2X").type, "delivery");
});

test("não reconhece EAN de produto", () => {
  assert.equal(classifyBridgeCode("7891234567890").recognized, false);
});

test("não reconhece zero isolado como comanda", () => {
  assert.equal(classifyBridgeCode("0").recognized, false);
});

test("não reconhece delivery com caracteres excluídos", () => {
  assert.equal(classifyBridgeCode("DV7K3M9Q0X").recognized, false);
  assert.equal(classifyBridgeCode("DV7K3M9QOX").recognized, false);
});
