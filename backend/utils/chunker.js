// backend/utils/chunker-v5.js
// Enhanced chunker that tracks page and paragraph numbers

/**
 * Split pages into chunks WITH metadata (page, paragraph)
 * @param {Array} pages - Array of {pageNumber, text, startChar, endChar}
 * @param {number} chunkSize - Target chunk size
 * @param {number} overlap - Overlap between chunks
 * @returns {Array} Chunks with metadata
 */
function splitIntoChunksWithMetadata(pages, chunkSize = 1000, overlap = 200) {
  const allChunks = [];
  let globalChunkIndex = 0;
  
  for (const page of pages) {
    const { pageNumber, text, startChar } = page;
    
    // Split page into paragraphs
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
    
    let currentChunk = '';
    let chunkStartChar = startChar;
    let paragraphNumber = 0;
    let chunkStartParagraph = 0;
    
    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i];
      paragraphNumber++;
      
      if (currentChunk.length + paragraph.length > chunkSize) {
        // Save current chunk with metadata
        if (currentChunk.trim().length > 0) {
          allChunks.push({
            text: currentChunk.trim(),
            chunkIndex: globalChunkIndex++,
            metadata: {
              page: pageNumber,
              paragraphNumber: chunkStartParagraph,
              paragraphRange: chunkStartParagraph === paragraphNumber - 1 
                ? chunkStartParagraph 
                : `${chunkStartParagraph}-${paragraphNumber - 1}`,
              startChar: chunkStartChar,
              endChar: chunkStartChar + currentChunk.length,
              chunkLength: currentChunk.length
            }
          });
        }
        
        // Start new chunk with overlap
        if (currentChunk.length > overlap) {
          const overlapText = currentChunk.slice(-overlap);
          currentChunk = overlapText + '\n\n' + paragraph;
          chunkStartChar = chunkStartChar + currentChunk.length - overlap - paragraph.length;
        } else {
          currentChunk = paragraph;
          chunkStartChar = startChar + text.indexOf(paragraph);
        }
        
        chunkStartParagraph = paragraphNumber;
      } else {
        // Add to current chunk
        if (currentChunk.length > 0) {
          currentChunk += '\n\n' + paragraph;
        } else {
          currentChunk = paragraph;
          chunkStartChar = startChar + text.indexOf(paragraph);
          chunkStartParagraph = paragraphNumber;
        }
      }
    }
    
    // Save last chunk of page
    if (currentChunk.trim().length > 0) {
      allChunks.push({
        text: currentChunk.trim(),
        chunkIndex: globalChunkIndex++,
        metadata: {
          page: pageNumber,
          paragraphNumber: chunkStartParagraph,
          paragraphRange: chunkStartParagraph === paragraphNumber 
            ? chunkStartParagraph 
            : `${chunkStartParagraph}-${paragraphNumber}`,
          startChar: chunkStartChar,
          endChar: chunkStartChar + currentChunk.length,
          chunkLength: currentChunk.length
        }
      });
    }
  }
  
  console.log(`📊 Chunking stats (Version 5):
    - Total chunks: ${allChunks.length}
    - Pages covered: ${pages.length}
    - Average chunk size: ${Math.round(allChunks.reduce((sum, c) => sum + c.text.length, 0) / allChunks.length)} characters
    - Metadata tracked: Page, Paragraph, Character positions
  `);
  
  return allChunks;
}

/**
 * Get statistics about chunks
 */
function getChunkStats(chunks) {
  const pageSet = new Set(chunks.map(c => c.metadata.page));
  const avgLength = chunks.reduce((sum, c) => sum + c.text.length, 0) / chunks.length;
  
  return {
    totalChunks: chunks.length,
    uniquePages: pageSet.size,
    averageLength: Math.round(avgLength),
    minLength: Math.min(...chunks.map(c => c.text.length)),
    maxLength: Math.max(...chunks.map(c => c.text.length))
  };
}

module.exports = {
  splitIntoChunksWithMetadata,
  getChunkStats
};