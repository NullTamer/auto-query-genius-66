
import Papa from "papaparse";
import { EvaluationDataItem, KeywordItem } from "../types";

// Helper function to extract keywords from JSON string in model_response
export const extractKeywordsFromModelResponse = (modelResponse: string): KeywordItem[] => {
  try {
    console.log("Trying to parse model_response:", modelResponse);
    
    // Check if it's already a valid JSON string format
    if (modelResponse && typeof modelResponse === 'string') {
      // Clean up the string - some CSV exports might have formatting issues
      let cleanedJson = modelResponse.trim();
      
      // Parse the JSON
      const parsedData = JSON.parse(cleanedJson);
      
      // Look for keywords in common fields
      if (parsedData) {
        // If it has Core Responsibilities or similar fields, extract keywords from there
        const possibleKeywordSources = [
          parsedData.keywords,
          parsedData.Core_Responsibilities,
          parsedData["Core Responsibilities"],
          parsedData.skills,
          parsedData.tags
        ];
        
        for (const source of possibleKeywordSources) {
          if (Array.isArray(source)) {
            return source.map(kw => typeof kw === 'string' ? { keyword: kw, frequency: 1 } : kw);
          } else if (source && typeof source === 'string') {
            return source.split(',').map(kw => ({ keyword: kw.trim(), frequency: 1 }));
          }
        }
        
        // If we found structured data but no keywords array, look for key-value pairs
        if (typeof parsedData === 'object') {
          // Extract keys from the object as keywords
          const extractedKeywords = [];
          for (const [key, value] of Object.entries(parsedData)) {
            if (key !== 'N/A' && key !== 'n/a' && key.length > 2) {
              if (typeof value === 'string' && value !== 'N/A') {
                extractedKeywords.push({
                  keyword: key.trim(),
                  frequency: 1,
                  category: value
                });
              } else {
                extractedKeywords.push({
                  keyword: key.trim(),
                  frequency: 1
                });
              }
            }
          }
          if (extractedKeywords.length > 0) {
            return extractedKeywords;
          }
        }
      }
    }
    
    // If we couldn't extract structured data, just extract the content as plain text
    return [{ keyword: "No valid keywords found", frequency: 0 }];
  } catch (error) {
    console.error("Error parsing model_response:", error, "Original:", modelResponse);
    
    // Fall back to basic string parsing if JSON parsing fails
    if (modelResponse && typeof modelResponse === 'string') {
      // Try to extract anything that looks like a keyword
      const keywordMatches = modelResponse.match(/["']([^"']+)["']/g);
      if (keywordMatches && keywordMatches.length > 0) {
        return keywordMatches.map(match => ({
          keyword: match.replace(/["']/g, '').trim(),
          frequency: 1
        }));
      }
    }
    
    return [{ keyword: "Failed to parse", frequency: 0 }];
  }
};

export const parseCSV = (text: string): EvaluationDataItem[] => {
  try {
    // Parse CSV with header
    const results = Papa.parse(text, { 
      header: true, 
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase()
    });
    
    if (!results.data || !Array.isArray(results.data) || results.data.length === 0) {
      throw new Error("Invalid CSV format or empty file");
    }

    console.log("CSV parsing result:", {
      rowCount: results.data.length,
      firstRow: results.data[0],
      fields: Object.keys(results.data[0] || {})
    });

    // Transform the CSV data into our expected format
    return results.data
      .filter((row: any) => row && typeof row === 'object')
      .map((row: any, index) => {
        // Debug each row
        console.log(`Processing row ${index}:`, row);
        
        // Extract ID from various possible fields
        let id = row.id || row.company_name || row.position_id || `item-${index}`;
        
        // Extract description from various possible fields
        let description = "";
        if (row.job_description || row.description || row.text || row.content) {
          description = row.job_description || row.description || row.text || row.content || "";
          
          // If there's a position_title, prepend it to the description
          if (row.position_title || row.title) {
            description = `${row.position_title || row.title}: ${description}`;
          }
        } else {
          console.warn(`Row ${index} missing description:`, row);
          return null;
        }
        
        // Extract ground truth keywords from model_response
        let groundTruth: KeywordItem[] = [];
        
        // Check for model_response field first
        if (row.model_response && typeof row.model_response === 'string') {
          groundTruth = extractKeywordsFromModelResponse(row.model_response);
          console.log(`Extracted ${groundTruth.length} keywords from model_response for row ${index}`);
        }
        
        // If no keywords found in model_response, try other fields
        if (groundTruth.length === 0) {
          // Try different potential field names for keywords
          const keywordFields = [
            'keywords', 'ground_truth', 'groundtruth', 
            'ground_truth_keywords', 'actual_keywords', 'expected_keywords',
            'manual_keywords', 'annotated_keywords'
          ];
          
          // Check each possible field name
          for (const field of keywordFields) {
            if (row[field] && typeof row[field] === 'string') {
              try {
                // Try to parse as JSON
                if (row[field].trim().startsWith('[') || row[field].trim().startsWith('{')) {
                  const parsed = JSON.parse(row[field]);
                  
                  if (Array.isArray(parsed)) {
                    // Handle array of strings or objects
                    groundTruth = parsed.map(item => {
                      if (typeof item === 'string') {
                        return { keyword: item.trim(), frequency: 1 };
                      } else if (item && typeof item === 'object') {
                        return {
                          keyword: (item.keyword || item.term || item.text || "").trim(),
                          frequency: item.frequency || item.count || item.weight || 1
                        };
                      }
                      return null;
                    }).filter(Boolean);
                    break;
                  } else if (parsed && typeof parsed === 'object') {
                    // Handle object with key-value pairs
                    groundTruth = Object.entries(parsed).map(([key, value]) => ({
                      keyword: key.trim(),
                      frequency: typeof value === 'number' ? value : 1
                    }));
                    break;
                  }
                } else {
                  // Try parsing as comma-separated list
                  groundTruth = row[field].split(',').map((keyword: string) => {
                    const [term, countStr] = keyword.split(':');
                    return {
                      keyword: term.trim(),
                      frequency: parseInt(countStr?.trim() || "1", 10) || 1
                    };
                  }).filter((item: any) => item.keyword);
                  break;
                }
              } catch (error) {
                console.warn(`Failed to parse ${field} for row ${index}:`, error);
                // Continue to the next field if parsing fails
              }
            }
          }
        }
        
        // If still no keywords found, extract some from the description for testing
        if (groundTruth.length === 0) {
          console.warn(`No ground truth keywords found for row ${index}. Creating fallback keywords.`);
          
          // For testing, create a minimal set of dummy keywords from the description
          const words = description.split(/\s+/).filter(word => 
            word.length > 4 && !/^\d+$/.test(word) && !['the', 'this', 'that', 'with', 'from', 'your'].includes(word.toLowerCase())
          ).slice(0, 5);
          
          groundTruth = words.map(word => ({
            keyword: word.toLowerCase().replace(/[^\w]/g, ''),
            frequency: 1
          }));
          
          console.log(`Created fallback keywords for testing:`, groundTruth);
        }

        return {
          id,
          description,
          groundTruth: groundTruth.filter(kw => kw && kw.keyword && kw.keyword.trim() !== "")
        };
      })
      .filter(Boolean); // Remove null items
  } catch (error) {
    console.error("Error parsing CSV:", error);
    throw error;
  }
};

// Parse JSON data files
export const parseJSON = (content: string): EvaluationDataItem[] => {
  try {
    const jsonData = JSON.parse(content);
    
    // Validate JSON structure
    if (!Array.isArray(jsonData) || jsonData.length === 0) {
      throw new Error("Invalid dataset format. Expecting an array of evaluation items.");
    }

    // Validate and transform items if needed
    return jsonData
      .filter((item: any) => item && typeof item === 'object')
      .map((item: any, index) => {
        if (!item.description) {
          console.warn("Missing description in item at index", index);
          return null;
        }
        
        let groundTruth = [];
        if (Array.isArray(item.groundTruth)) {
          groundTruth = item.groundTruth
            .filter((kw: any) => kw)
            .map((kw: any) => {
              if (typeof kw === 'string') {
                return { keyword: kw, frequency: 1 };
              } else if (kw && typeof kw === 'object') {
                return {
                  keyword: kw.keyword || "",
                  frequency: typeof kw.frequency === 'number' ? kw.frequency : 1
                };
              }
              return null;
            })
            .filter(Boolean);
        } else {
          console.warn("Missing or invalid groundTruth in item at index", index);
          return null;
        }
        
        return {
          id: item.id || `item-${index}`,
          description: item.description,
          groundTruth
        };
      })
      .filter(Boolean);
  } catch (error) {
    console.error("Error parsing JSON:", error);
    throw error;
  }
};
