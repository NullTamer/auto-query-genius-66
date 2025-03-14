
import { KeywordItem } from "../types";

// Advanced baseline algorithm for keyword extraction (no paid API required)
export const extractBaselineKeywords = (text: string): KeywordItem[] => {
  try {
    // Common English stopwords
    const stopwords = new Set([
      "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "as", "at", "be", "because", 
      "been", "before", "being", "below", "between", "both", "but", "by", "could", "did", "do", "does", "doing", "down", "during", 
      "each", "few", "for", "from", "further", "had", "has", "have", "having", "he", "he'd", "he'll", "he's", "her", "here", 
      "here's", "hers", "herself", "him", "himself", "his", "how", "how's", "i", "i'd", "i'll", "i'm", "i've", "if", "in", "into", 
      "is", "it", "it's", "its", "itself", "let's", "me", "more", "most", "my", "myself", "nor", "of", "on", "once", "only", "or", 
      "other", "ought", "our", "ours", "ourselves", "out", "over", "own", "same", "she", "she'd", "she'll", "she's", "should", 
      "so", "some", "such", "than", "that", "that's", "the", "their", "theirs", "them", "themselves", "then", "there", "there's", 
      "these", "they", "they'd", "they'll", "they're", "they've", "this", "those", "through", "to", "too", "under", "until", "up", 
      "very", "was", "we", "we'd", "we'll", "we're", "we've", "were", "what", "what's", "when", "when's", "where", "where's", 
      "which", "while", "who", "who's", "whom", "why", "why's", "with", "would", "you", "you'd", "you'll", "you're", "you've", 
      "your", "yours", "yourself", "yourselves",
      // Additional stop words for job descriptions
      "job", "work", "experience", "skills", "team", "company", "position", "role", "will", "ability", "years", "required", 
      "requirements", "knowledge", "must", "candidate", "applicant", "looking", "working", "responsibilities", "qualifications"
    ]);

    // Job-related important terms (to boost rankings)
    const importantTerms = {
      // Programming languages
      "javascript": 5, "python": 5, "java": 5, "c++": 5, "ruby": 5, "php": 5, "typescript": 5, "kotlin": 5, "swift": 5,
      "rust": 5, "go": 5, "scala": 5, "c#": 5, ".net": 5, "perl": 5, "r": 5, "bash": 5, "powershell": 5,
      
      // Frameworks
      "react": 4, "angular": 4, "vue": 4, "node": 4, "express": 4, "django": 4, "flask": 4, "spring": 4, "laravel": 4,
      "rails": 4, "asp.net": 4, "jquery": 3, "bootstrap": 3, "tailwind": 4, "next.js": 4, "gatsby": 4, "svelte": 4,
      
      // Databases
      "sql": 4, "nosql": 4, "mysql": 4, "postgresql": 4, "mongodb": 4, "sqlite": 4, "oracle": 4, "redis": 4,
      "elasticsearch": 4, "dynamodb": 4, "firebase": 4, "neo4j": 4, "cassandra": 4,
      
      // Cloud
      "aws": 5, "azure": 5, "gcp": 5, "google cloud": 5, "cloud": 4, "kubernetes": 5, "docker": 5, "containerization": 4,
      "serverless": 4, "microservices": 4, "lambda": 4, "ec2": 4, "s3": 4, "rds": 4,
      
      // Data Science
      "machine learning": 5, "ml": 5, "ai": 5, "data science": 5, "tensorflow": 5, "pytorch": 5, "pandas": 4,
      "numpy": 4, "scikit-learn": 4, "data mining": 4, "statistics": 4, "nlp": 5, "computer vision": 5,
      
      // DevOps
      "ci/cd": 5, "jenkins": 4, "github actions": 4, "gitlab ci": 4, "devops": 5, "sre": 5, "monitoring": 4,
      "logging": 4, "prometheus": 4, "grafana": 4, "ansible": 4, "terraform": 5, "chef": 4, "puppet": 4,
      
      // Security
      "security": 4, "cybersecurity": 5, "encryption": 4, "penetration testing": 5, "pentest": 5, "vulnerability": 4,
      "compliance": 4, "oauth": 4, "jwt": 4, "authentication": 4, "authorization": 4
    };

    if (!text || typeof text !== 'string') {
      console.warn("extractBaselineKeywords received invalid text:", text);
      return [];
    }

    // Pre-process text
    const cleanText = text.toLowerCase()
      .replace(/\b(?:years?|yrs?)(?:\s+of)?\s+experience\b/g, "") // Remove "X years experience" phrases
      .replace(/\b\d+\s*[-+]?\s*\d*\s*years?\b/g, "")              // Remove "X-Y years" phrases
      .replace(/[^\w\s-]/g, ' ')                                    // Replace punctuation with spaces
      .replace(/\s+/g, ' ')                                         // Normalize whitespace
      .trim();

    // Extract n-grams (1, 2, and 3 word phrases)
    const words = cleanText.split(/\s+/);
    const ngrams: Record<string, number> = {};
    
    // Process unigrams (single words)
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      if (word.length > 2 && !stopwords.has(word)) {
        ngrams[word] = (ngrams[word] || 0) + 1;
      }
    }
    
    // Process bigrams (two-word phrases)
    for (let i = 0; i < words.length - 1; i++) {
      const w1 = words[i];
      const w2 = words[i + 1];
      
      if (w1.length > 2 && w2.length > 2 && 
          !stopwords.has(w1) && !stopwords.has(w2)) {
        const bigram = `${w1} ${w2}`;
        ngrams[bigram] = (ngrams[bigram] || 0) + 2; // Slightly favor bigrams
      }
    }
    
    // Process trigrams (three-word phrases)
    for (let i = 0; i < words.length - 2; i++) {
      const w1 = words[i];
      const w2 = words[i + 1];
      const w3 = words[i + 2];
      
      if (w1.length > 2 && w2.length > 2 && w3.length > 2 && 
          !stopwords.has(w1) && !stopwords.has(w2) && !stopwords.has(w3)) {
        const trigram = `${w1} ${w2} ${w3}`;
        ngrams[trigram] = (ngrams[trigram] || 0) + 3; // More weight to trigrams
      }
    }

    // Boost important terms
    for (const [term, boost] of Object.entries(importantTerms)) {
      if (cleanText.includes(term)) {
        ngrams[term] = (ngrams[term] || 0) + boost;
      }
    }

    // Convert to array, sort by frequency, and take top 20
    const result = Object.entries(ngrams)
      .map(([keyword, frequency]) => ({ keyword, frequency }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 20);

    console.log("Extracted keywords with enhanced baseline algorithm:", result.length);
    return result;
  } catch (error) {
    console.error("Error in extractBaselineKeywords:", error);
    return [];
  }
};
