export class PageError extends Error {
    constructor(error) {
        super(error);
        this.name = 'PageError'
        this.message = error
    }
}