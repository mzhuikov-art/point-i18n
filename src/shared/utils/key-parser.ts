import { TextDocument, Position, Range } from '../types';

export interface I18nKeyInfo {
    key: string;
    range: Range;
}

export function getI18nKeyAtPosition(
    document: TextDocument,
    position: Position
): string | null {
    const info = getI18nKeyInfoAtPosition(document, position);
    return info?.key ?? null;
}

export function getI18nKeyInfoAtPosition(
    document: TextDocument,
    position: Position
): I18nKeyInfo | null {
    const patterns = [
        /\$t\s*\(\s*(['"`])([^'"`]+)\1/,
        /i18n\.t\s*\(\s*(['"`])([^'"`]+)\1/,
        /\bt\s*\(\s*(['"`])([^'"`]+)\1/,
    ];
    
    const text = document.getText();
    
    for (const regex of patterns) {
        const match = regex.exec(text);
        if (match) {
            const matchIndex = match.index;
            const matchLength = match[0].length;
            
            // Проверяем, попадает ли позиция в диапазон совпадения
            const lines = text.substring(0, matchIndex).split('\n');
            const startLine = lines.length - 1;
            const startChar = lines[lines.length - 1].length;
            
            const matchText = text.substring(matchIndex, matchIndex + matchLength);
            const matchLines = matchText.split('\n');
            const endLine = startLine + matchLines.length - 1;
            const endChar = matchLines.length === 1 
                ? startChar + matchText.length 
                : matchLines[matchLines.length - 1].length;
            
            const range: Range = {
                start: { line: startLine, character: startChar },
                end: { line: endLine, character: endChar }
            };
            
            // Проверяем, попадает ли позиция в этот range
            if (position.line >= range.start.line && position.line <= range.end.line) {
                if (position.line === range.start.line && position.character < range.start.character) {
                    continue;
                }
                if (position.line === range.end.line && position.character > range.end.character) {
                    continue;
                }
                
                if (match[2]) {
                    return { key: match[2], range };
                }
            }
        }
    }
    
    return null;
}

