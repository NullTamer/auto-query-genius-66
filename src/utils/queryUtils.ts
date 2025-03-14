
export const generateBooleanQuery = (keywords: Array<{ keyword: string; category?: string; frequency: number }>) => {
  if (keywords.length === 0) return "";

  // Sort keywords by frequency, highest first
  const sortedKeywords = [...keywords].sort((a, b) => b.frequency - a.frequency);
  
  // If we have categories in some keywords, use them for grouping
  const hasCategories = sortedKeywords.some(k => k.category !== undefined);
  
  if (hasCategories) {
    // Original logic with categories
    const skills = sortedKeywords.filter(k => k.category === 'skill').map(k => k.keyword);
    const requirements = sortedKeywords.filter(k => k.category === 'requirement').map(k => k.keyword);

    const essentialSkills = skills.slice(0, 3).join(" AND ");
    const optionalSkills = skills.slice(3).join(" OR ");
    const requirementsClauses = requirements.map(req => `"${req}"`).join(" OR ");

    const parts = [];
    if (essentialSkills) parts.push(`(${essentialSkills})`);
    if (optionalSkills) parts.push(`(${optionalSkills})`);
    if (requirementsClauses) parts.push(`(${requirementsClauses})`);

    return parts.join(" AND ");
  } else {
    // Simplified logic without categories
    // Take top 3 keywords as essential (AND), the rest as optional (OR)
    const essential = sortedKeywords.slice(0, 3).map(k => k.keyword).join(" AND ");
    const optional = sortedKeywords.slice(3).map(k => k.keyword).join(" OR ");
    
    const parts = [];
    if (essential) parts.push(`(${essential})`);
    if (optional) parts.push(`(${optional})`);
    
    return parts.join(" AND ");
  }
};
