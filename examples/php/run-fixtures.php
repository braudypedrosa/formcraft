<?php
require __DIR__ . '/validate.php';
$fixture = json_decode(file_get_contents(__DIR__ . '/../../fixtures/submission-contract-v1.json'), false, 512, JSON_THROW_ON_ERROR);
$failures = 0;
foreach ($fixture->cases as $case) {
    $actual = validate_answer($case->field, $case->value ?? null, property_exists($case, 'value'));
    if ($actual !== $case->expectedCode) { fwrite(STDERR, $case->name . ': expected ' . json_encode($case->expectedCode) . ', got ' . json_encode($actual) . "\n"); $failures++; }
}
if ($failures) exit(1);
echo count($fixture->cases) . " shared PHP answer fixtures passed\n";
