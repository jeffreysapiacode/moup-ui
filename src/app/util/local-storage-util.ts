export class LocalStorageUtil {

  static getStorage(uuid: any) {
    let storage = JSON.parse(<string>localStorage.getItem('moup'));
    if (storage) {
      for (let storedInfo of storage) {
        if (storedInfo.contentUuid === uuid) {
          return storedInfo;
        }
      }
    }
  }

  static reset(uuid: any) {
    let storage = JSON.parse(<string>localStorage.getItem('moup'));
    if (storage) {
      for (let storedInfo of storage) {
        if (storedInfo.contentUuid === uuid) {
          storedInfo.seek = 0;
        }
      }
    }
    localStorage.setItem('moup', JSON.stringify(storage));
  }
}
