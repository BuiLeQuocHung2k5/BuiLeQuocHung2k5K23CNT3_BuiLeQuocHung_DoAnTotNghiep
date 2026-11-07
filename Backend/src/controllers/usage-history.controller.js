import { usageReadScope, validateUsageQuery } from "../utils/analytics-validation.js";

export function createUsageHistoryController(service) {
    const list = me => async (req, res) => {
        const query = validateUsageQuery(req.query, usageReadScope(req.auth, me)), result = await service.list(query);
        res.json({ success: true, data: result.items, pagination: result.pagination, period: { start_date: query.start_date, end_date: query.end_date, timezone: "UTC" } });
    };
    return { list: list(false), me: list(true) };
}
