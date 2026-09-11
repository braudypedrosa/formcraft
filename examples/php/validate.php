<?php
/** Backend reference for the shared answer fixtures, NOT a WordPress plugin or HTTP endpoint.
 * The caller must load and validate its authoritative schema and enforce request/revision policy.
 * Returns the contract-v1 error code or null. Custom types are explicitly registered here.
 */
declare(strict_types=1);
function validate_answer(stdClass $f, mixed $value, bool $present): ?string {
    $type = $f->type;
    if (in_array($type, ['heading','paragraph','section','divider'], true)) return null;
    $builtins = ['text','email','phone','textarea','dropdown','checkbox','number','radio','checkboxes','multiselect','date','time','url','name','address','password','hidden','structured_name','structured_address','rating'];
    if ($type !== 'custom' && !in_array($type, $builtins, true)) throw new RuntimeException('Unsupported field type');
    if ($type === 'custom') {
        if (($f->customType ?? '') !== 'demo.reference' || ($f->customVersion ?? 0) !== 1) throw new RuntimeException('Unsupported custom validator');
        if (!in_array($f->config->prefix ?? '', ['FC','REF'], true) || array_diff(array_keys(get_object_vars($f->config)), ['prefix'])) throw new RuntimeException('Invalid custom configuration');
        $missing = !$present || $value === false || (is_string($value) && trim($value) === '') || (is_array($value) && count($value) === 0);
        if ($missing) return $f->required ? 'required' : null;
        return is_string($value) && preg_match('/^' . $f->config->prefix . '-[0-9]{4}$/D', $value) ? null : 'invalid_reference';
    }
    if (in_array($type, ['structured_name','structured_address'], true)) {
        if (!$present && !$f->required) return null;
        if (!$value instanceof stdClass) return 'invalid_' . $type;
        $keys = $type === 'structured_name' ? ['first','last'] : ['street','line2','city','region','postalCode','country'];
        foreach (get_object_vars($value) as $key => $part) if (!in_array($key,$keys,true) || !is_string($part)) return 'invalid_' . $type;
        $required = $type === 'structured_name' ? ['first','last'] : ['street','city','postalCode','country'];
        if ($f->required) foreach ($required as $key) if (!isset($value->$key) || trim($value->$key) === '') return 'invalid_' . $type;
        return null;
    }
    $multi = in_array($type, ['checkboxes','multiselect'], true);
    $missing = $type === 'checkbox' ? $value !== true : ($multi ? !is_array($value) || count($value) === 0 : !is_string($value) || trim($value) === '');
    if ($f->required && $missing) return 'required';
    if (!$present || $value === '' || ($multi && is_array($value) && !$value)) return null;
    if ($type === 'checkbox') return is_bool($value) ? null : 'invalid_checkbox';
    $options = array_map(fn($o) => $o->value, $f->options);
    if ($multi) {
        if (!is_array($value) || count(array_unique($value, SORT_REGULAR)) !== count($value)) return 'invalid_' . $type;
        foreach ($value as $v) if (!is_string($v) || !in_array($v,$options,true)) return 'invalid_' . $type;
        return null;
    }
    if (!is_string($value)) return 'invalid_' . $type;
    $valid = match($type) {
        'email' => (bool) preg_match("/^(?!\\.)(?!.*\\.\\.)([A-Za-z0-9_'+\\-\\.]*)[A-Za-z0-9_+\\-]@([A-Za-z0-9][A-Za-z0-9\\-]*\\.)+[A-Za-z]{2,}$/D", $value),
        'dropdown', 'radio' => in_array($value,$options,true),
        'number' => (bool) preg_match('/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/D',$value) && is_finite((float)$value),
        'date' => (bool) preg_match('/^\d{4}-\d{2}-\d{2}$/D',$value) && checkdate((int)substr($value,5,2),(int)substr($value,8,2),(int)substr($value,0,4)),
        'time' => (bool) preg_match('/^(?:[01]\d|2[0-3]):[0-5]\d$/D',$value),
        'url' => in_array(strtolower(parse_url($value,PHP_URL_SCHEME) ?: ''),['http','https'],true) && (bool) parse_url($value,PHP_URL_HOST),
        'rating' => (bool) preg_match('/^\d+$/D',$value) && (int)$value >= 1 && (int)$value <= ($f->ratingMax ?? 5),
        default => true,
    };
    return $valid ? null : 'invalid_' . $type;
}
