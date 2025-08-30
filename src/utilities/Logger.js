export default class Logger {
  constructor() {
    this.counter = 0;
    setInterval(() => {
      this.counter = 0;
    }, 5000);
  }

  log(msg) {
    this.counter++;
    console.log(
      `\n------------------------------------\nstep-${this.counter}---: ${msg}\n-------------------------------------\n`
    );
  }
  logd(msg, data) {
    this.counter++;
    console.log(
      `\n------------------------------------\nstep-${this.counter}---: ${msg}\n${data}\n-------------------------------------\n`
    );
  }
}
