

export class TimeUtils {

  static formatTime (seconds: any) {
    console.log(seconds);
    let secondsFmt = Math.floor(seconds);
    let minutes = Math.floor(seconds / 60);
    let hours = Math.floor(seconds / (60 * 60));
    if (hours === 0) {
      return minutes + ':' + secondsFmt;
    } else {
      return hours + ':' + minutes + ':' + secondsFmt;
    }
  }

}

