import { pagination } from "../utils/catalog-validation.js";

export function createStatisticsService(model) {
    return {
        async overview(query) { return model.overview(query); },
        async borrows(query) { return model.borrows(query); },
        async users(query) { const result = await model.users(query); return { items: result.items, pagination: pagination(query, result.total) }; },
    };
}
