import test from 'node:test';
import assert from 'node:assert/strict';
import { numberToWordsFr, formatAmountWithWords } from './sales-invoice-utils.js';

test('numberToWordsFr converts simple amounts', () => {
  assert.equal(numberToWordsFr(0), 'zéro');
  assert.equal(numberToWordsFr(15), 'quinze');
  assert.equal(numberToWordsFr(1500), 'mille cinq cents');
});

test('formatAmountWithWords adds FCFA suffix', () => {
  assert.equal(formatAmountWithWords(2500), 'deux mille cinq cents FCFA');
});
