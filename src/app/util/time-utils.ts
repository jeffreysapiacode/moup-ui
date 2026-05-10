export class TimeUtils {

  static formatTime(totalSeconds: any) {
    const seconds = Math.floor(totalSeconds);
    const minutes = Math.floor(totalSeconds / 60);
    const hours = Math.floor(totalSeconds / (60 * 60));
    const mm = String((minutes - (hours * 60))).padStart(2, '0');
    const ss = String(seconds - (minutes * 60)).padStart(2, '0');
    if (hours === 0) {
      return minutes + ':' + ss;
    } else {
      return hours + ':' + mm + ':' + ss;
    }
  }
}
