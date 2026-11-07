import { validateUsageEvent } from "../utils/analytics-validation.js";
import { pagination } from "../utils/catalog-validation.js";

export function createUsageHistoryService(model) {
    return {
        async record(event, connection) { await model.record(validateUsageEvent(event), connection); },
        async list(query) { const result = await model.list(query); return { items: result.items, pagination: pagination(query, result.total) }; },
    };
}
