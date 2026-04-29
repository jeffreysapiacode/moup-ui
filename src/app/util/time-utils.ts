

export class TimeUtils {

  static formatTime (seconds: any) {
    let secondsFmt = Math.floor(seconds);
    let minutes = Math.floor(seconds / 60);
    let hours = Math.floor(seconds / (60 * 60));
    if (hours === 0) {
      return minutes + ':' + (secondsFmt - (minutes * 60)) ;
    } else {
      return hours + ':' + (minutes - (hours * 60)) + ':' + (secondsFmt - (minutes * 60));
    }
  }

}

