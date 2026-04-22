import {Component, OnInit} from '@angular/core';
import {MediaPlayer} from './media-player/media-player';
import {ContentCard} from './content-card/content-card';
import {HttpClient} from '@angular/common/http';

@Component({
  selector: 'app-main',
  imports: [
    MediaPlayer,
    ContentCard
  ],
  templateUrl: './main.html',
  styleUrl: './main.sass',
})
export class Main implements OnInit {

  public dataList: any;

  constructor(private http: HttpClient) {

  }

  ngOnInit(): void {
        this.http.get('http://localhost:8080/content')
          .subscribe((contentList) => {
            console.log(JSON.stringify(contentList));
            this.dataList = contentList;
          });
  }

}
