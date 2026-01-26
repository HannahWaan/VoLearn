import { applyScope } from './scopeEngine.js';
import { applyFilters } from './filterEngine.js';
import { sortWords } from './sortEngine.js';
import { limitWords } from './limitEngine.js';

export function buildWordPipeline(words, config){
    let result = [...words];

    result = applyScope(result, config.scope || {});
    result = applyFilters(result, config.include || {});
    result = sortWords(result, config.sort || 'random');
    result = limitWords(result, config.limit || 0);

    return result;
}
