import { IWindowService } from '../../../shared/types';

export class ToggleDecorationsAction {
    private decorationsEnabled = true;

    constructor(private windowService: IWindowService) {}

    async execute(): Promise<void> {
        this.decorationsEnabled = !this.decorationsEnabled;
        const status = this.decorationsEnabled ? 'включены' : 'выключены';
        this.windowService.showInformationMessage(`Inline переводы ${status}`);
    }

    isEnabled(): boolean {
        return this.decorationsEnabled;
    }
}

