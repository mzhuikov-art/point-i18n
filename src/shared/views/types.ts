export interface IdeApi {
    postMessage(message: any): void;
}

export interface IdeTheme {
    fontFamily: string;
    fontSize: string;
    foreground: string;
    inputBackground: string;
    inputForeground: string;
    inputBorder: string;
    buttonBackground: string;
    buttonForeground: string;
    buttonHoverBackground: string;
    buttonSecondaryBackground: string;
    buttonSecondaryForeground: string;
    buttonSecondaryHoverBackground: string;
    panelBorder: string;
    dropdownBackground: string;
    dropdownForeground: string;
    dropdownBorder: string;
    textBlockQuoteBackground: string;
    textLinkForeground: string;
    errorForeground: string;
    successForeground: string;
    focusBorder: string;
    editorBackground: string;
    editorFontFamily: string;
    listInactiveSelectionBackground: string;
    listHoverBackground: string;
}

export interface IdeConfig {
    getApi: () => IdeApi;
    theme: IdeTheme;
}

