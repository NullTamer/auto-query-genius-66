
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
    // Enhanced query generation logic for better results
    
    // Group by importance (frequency)
    const criticalKeywords = sortedKeywords.filter(k => k.frequency >= 4).map(k => k.keyword); 
    const importantKeywords = sortedKeywords.filter(k => k.frequency === 3).map(k => k.keyword);
    const optionalKeywords = sortedKeywords.filter(k => k.frequency < 3).map(k => k.keyword);
    
    const parts = [];
    
    // Critical terms - ALL must be present (AND)
    if (criticalKeywords.length > 0) {
      parts.push(`(${criticalKeywords.join(" AND ")})`);
    }
    
    // Important terms - at least 2 must be present if we have more than 3
    if (importantKeywords.length > 3) {
      // Create combinations of terms with OR between them
      const combinations = [];
      for (let i = 0; i < importantKeywords.length; i++) {
        for (let j = i + 1; j < importantKeywords.length; j++) {
          combinations.push(`(${importantKeywords[i]} AND ${importantKeywords[j]})`);
        }
      }
      parts.push(`(${combinations.join(" OR ")})`);
    } else if (importantKeywords.length > 0) {
      // If we have 3 or fewer important terms, at least one must be present
      parts.push(`(${importantKeywords.join(" OR ")})`);
    }
    
    // Optional terms - some would be nice to have
    if (optionalKeywords.length > 0) {
      const optionalClause = optionalKeywords.slice(0, 5).join(" OR "); // Limit to 5 to keep query manageable
      parts.push(`(${optionalClause})`);
    }
    
    // If we don't have structured groups, fall back to the simpler approach
    if (parts.length === 0) {
      const essential = sortedKeywords.slice(0, 3).map(k => k.keyword).join(" AND ");
      const optional = sortedKeywords.slice(3).map(k => k.keyword).join(" OR ");
      
      if (essential) parts.push(`(${essential})`);
      if (optional) parts.push(`(${optional})`);
    }
    
    return parts.join(" AND ");
  }
};
