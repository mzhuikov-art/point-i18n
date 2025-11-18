// Типы для IntelliJ Platform API
declare namespace java {
    namespace io {
        class File {
            constructor(path: string, ...paths: string[]);
            getPath(): string;
            exists(): boolean;
        }
    }
}

declare namespace com {
    namespace intellij {
        namespace ide {
            namespace util {
                class PropertiesComponent {
                    static getInstance(): PropertiesComponent;
                    getValue(key: string): string | null;
                    setValue(key: string, value: string): void;
                    unsetValue(key: string): void;
                }
            }
        }
        namespace openapi {
            namespace project {
                class ProjectManager {
                    static getInstance(): ProjectManager;
                    getOpenProjects(): Project[];
                }
                interface Project {
                    getBasePath(): string;
                    getName(): string;
                    getBaseDir(): VirtualFile;
                    getMessageBus(): MessageBus;
                }
            }
            namespace vfs {
                class VfsUtil {
                    static findFileByIoFile(file: java.io.File, project: com.intellij.openapi.project.Project): VirtualFile | null;
                    static collectChildrenRecursively(file: VirtualFile): VirtualFile[];
                }
                interface VirtualFile {
                    getPath(): string;
                    getUrl(): string;
                    exists(): boolean;
                    contentsToByteArray(): number[];
                }
            }
            namespace fileEditor {
                class FileEditorManager {
                    static getInstance(project: com.intellij.openapi.project.Project): FileEditorManager;
                    getSelectedTextEditor(): Editor | null;
                    openTextEditor(descriptor: OpenFileDescriptor, focusEditor: boolean): Editor | null;
                    addFileEditorManagerListener(listener: FileEditorManagerListener): void;
                    removeFileEditorManagerListener(listener: FileEditorManagerListener): void;
                }
                interface FileEditorManagerListener {
                    fileClosed(source: FileEditorManager, file: com.intellij.openapi.vfs.VirtualFile): void;
                }
                class OpenFileDescriptor {
                    constructor(project: com.intellij.openapi.project.Project, file: com.intellij.openapi.vfs.VirtualFile);
                }
            }
            namespace fileEditor {
                namespace FileDocumentManager {
                    interface FileDocumentManagerListener {
                        beforeDocumentSaving(document: Document): void;
                        beforeAllDocumentsSaving(): void;
                        beforeFileContentReload(file: com.intellij.openapi.vfs.VirtualFile, document: Document): void;
                        fileWithNoDocumentChanged(file: com.intellij.openapi.vfs.VirtualFile): void;
                        unsavedDocumentsDropped(): void;
                    }
                }
                class FileDocumentManager {
                    static getInstance(): FileDocumentManager;
                    getDocument(file: com.intellij.openapi.vfs.VirtualFile): Document | null;
                }
            }
            namespace ui {
                class Messages {
                    static showInfoMessage(message: string, title: string): void;
                    static showErrorDialog(message: string, title: string, options: string[]): number;
                    static showWarningDialog(message: string, title: string): void;
                }
                class InputDialog {
                    constructor(
                        parentComponent: any,
                        message: string,
                        title: string,
                        icon: any,
                        initialValue: string,
                        validator: any,
                        placeHolder: string[]
                    );
                    showAndGet(): boolean;
                    getInputString(): string;
                }
            }
            namespace editor {
                interface Editor {
                    getDocument(): Document;
                    getCaretModel(): CaretModel;
                    getSelectionModel(): SelectionModel;
                    getScrollingModel(): ScrollingModel;
                }
                interface Document {
                    getText(): string;
                    getVirtualFile(): com.intellij.openapi.vfs.VirtualFile | null;
                    getLineStartOffset(line: number): number;
                }
                interface CaretModel {
                    getOffset(): number;
                    getCurrentCaret(): Caret;
                }
                interface Caret {
                    getOffset(): number;
                }
                interface SelectionModel {
                    hasSelection(): boolean;
                    addSelectionListener(listener: SelectionListener): void;
                }
                interface SelectionListener {
                    selectionChanged(): void;
                }
                interface ScrollingModel {
                    scrollToCaret(scrollType: ScrollType): void;
                }
                enum ScrollType {
                    CENTER
                }
                namespace event {
                    interface DocumentEvent {
                        getDocument(): Document;
                    }
                    interface EditorFactoryListener {
                        editorCreated(event: EditorEvent): void;
                        editorReleased(event: EditorEvent): void;
                    }
                    interface EditorEvent {
                        getEditor(): Editor;
                    }
                }
            }
            namespace psi {
                namespace search {
                    class GlobalSearchScope {
                        static projectScope(project: com.intellij.openapi.project.Project): GlobalSearchScope;
                    }
                    interface GlobalSearchScope {}
                }
            }
            namespace fileTypes {
                class FileTypeManager {
                    static getInstance(): FileTypeManager;
                    getFileTypeByExtension(extension: string): FileType;
                }
                interface FileType {}
            }
            namespace messageBus {
                interface MessageBus {
                    connect(): MessageBusConnection;
                }
                interface MessageBusConnection {
                    subscribe(topic: any, handler: any): void;
                    disconnect(): void;
                }
            }
        }
    }
}

