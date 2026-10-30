export class Feedback {

    constructor(
        message,
        opts = {},
    ) {
        this.message = message
        this.type = opts.type ?? this.getDefaultType()
        this.size = opts.size ?? this.getDefaultSize()
        this.button = opts.button ?? this.getDefaultButton()
    }

    getDefaultButton() {
        return {
            'text': '',
            'size': '',
            'variant': '',
        }
    }

    getDefaultSize() {
        return 'attention'
    }

    getDefaultType() {
        return 'positive'
    }

    show(options, duration = 3000) {
        this.message = options.message
        this.type = options.type ?? this.getDefaultType()
        this.size = options.size ?? this.getDefaultSize()
        this.button = options.button ?? this.getDefaultButton()
        if (duration) {
            setTimeout(() => {
                    this.message = ''
                    this.type = this.getDefaultType()
                    this.size = this.getDefaultSize()
                },
                duration
            );
        }
    }
}
