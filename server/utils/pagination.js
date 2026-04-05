// Updated
module.exports = function paginate(query, { page = 1, limit = 20 } = {}) {
  page = parseInt(page, 10) || 1;
  limit = parseInt(limit, 10) || 20;
  const offset = (page - 1) * limit;
  return { limit, offset, page };
};

