<script setup>
const {data, displayAs = 'number', sort = 'D', value = 'score'} = defineProps(['data', 'displayAs', 'sort', 'value'])

const bars = computed(() => {
    let rows = Object.values(data).sort((a, b) => {
        return sort === 'A' ? a[value] - b[value] : b[value] - a[value]
    });
    //  calculate largest value
    let largestValue = sort === 'A' ? rows[rows.length - 1][value] : rows[0][value];
    //  add in percentage compared to largest value
    return rows.map((a) => {
        a.percent = a[value] / largestValue * 100;
        return a;
    });
})


function getFormattedValue(value) {
    switch(displayAs) {
        case 'time':
            return getTimeFromSeconds(value);
        default:
            return value;  
    }
}

function getTimeFromSeconds(seconds) {
    let numbers = {};
    numbers.seconds = seconds;
    numbers.hours = Math.floor(numbers.seconds / 60 / 60);
    numbers.seconds = seconds - (numbers.hours * 60 * 60);
    numbers.minutes = Math.floor(numbers.seconds / 60);
    numbers.seconds = numbers.seconds - (numbers.minutes * 60);

    let string = {};

    string.seconds = numbers.minutes ? (numbers.seconds < 10 ? '0' + numbers.seconds : numbers.seconds) : numbers.seconds;
    string.minutes = numbers.hours ? (numbers.minutes < 10 ? '0' + numbers.minutes : numbers.minutes) : numbers.minutes;
    string.hours = numbers.hours;

    string.arr = [];

    if (string.hours) {
        string.arr.push(string.hours)
    }
    if (string.minutes) {
        string.arr.push(string.minutes)
    }
    string.arr.push(string.seconds)

    string.all = string.arr.join(':')

    return string.all;
}

</script>

<template>
    <div class="bubble-bars">
        <div class="bubble-bar"
            v-for="bar in bars"
            :key="bar.label"
            :class="{'bubble-bar--me': bar.isUser}"
        >
            <div class="bubble">{{bar.label}}</div>
            <div class="bar-holder">
                <div class="bar" :data-width="bar.percent" :style="'width: ' + bar.percent + '%'"></div>
                <div class="value" :style="'left: ' + bar.percent + '%'">{{getFormattedValue(bar[value])}}</div>
            </div>        
        </div>
    </div>
</template>

<style scoped>
.bubble-bars {
    display: flex;
    gap: .7rem;
    align-items: flex-start;
    inline-size: 100%;
    flex-direction: column;

}
.bubble-bar {
    display: flex;
    align-items: center;
    inline-size: 100%;
    gap: .5rem;
}
.bubble {
    background:var(--card-background);
    width: 3.8rem;
    height: 3.8rem;
    border-radius: 50%;
    display: grid;
    place-content: center;
    border: 1px solid var(--puzzle-tile-text, --primary);
    position: relative;
    left: 0;
    font-weight: 900;
    font-size: 1.2rem;
}

.bar-holder {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    gap: .2rem;
    background: var(--border);
    outline-offset: -1px;
    block-size: 1rem;
    border-radius: var(--border-radius-inner);
    position: relative;
    margin: 0 3.5rem 0 0;
}

.bar {
    background: var(--puzzle-tile-text, --primary);
    block-size: 100%;
    border-radius: var(--border-radius-inner);
    inline-size: 0;
    transition: width .5s .3s ease-in-out
}

.value {
    position: absolute;
    inset-inline-start: 100%;
    inset-block-start: 50%;
    transform: translateY(-50%);
    font-size: 1.2rem;
    font-weight: 900;
    inline-size: 3.5rem;
    transition: left .5s .3s ease-in-out
}

/*  highlight the current user's bar */
.bubble-bar--me .bubble {
    background-color: var(--puzzle-tile-text);
    color: var(--text-on-primary);
}

.bubble-bar--me .value {
    font-weight: 900;
}


</style>