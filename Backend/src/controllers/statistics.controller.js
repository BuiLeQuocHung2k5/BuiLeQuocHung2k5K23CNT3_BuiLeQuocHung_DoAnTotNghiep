import { validateStatisticsQuery } from "../utils/analytics-validation.js";

export function createStatisticsController(service) {
    const period = query => ({ start_date: query.start_date, end_date: query.end_date, timezone: "UTC" });
    return {
        async overview(req, res) { const query = validateStatisticsQuery(req.query, "overview"); res.json({ success: true, data: await service.overview(query), period: period(query) }); },
        async borrows(req, res) { const query = validateStatisticsQuery(req.query, "borrows"); res.json({ success: true, data: await service.borrows(query), period: { ...period(query), group_by: query.group_by } }); },
        async users(req, res) { const query = validateStatisticsQuery(req.query, "users"), result = await service.users(query); res.json({ success: true, data: result.items, pagination: result.pagination, period: period(query) }); },
    };
}
