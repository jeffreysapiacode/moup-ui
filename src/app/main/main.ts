import {Component, OnInit} from '@angular/core';
import {MediaPlayer} from './media-player/media-player';
import {ContentCard} from './content-card/content-card';
import {HttpClient} from '@angular/common/http';
import {NgForOf, NgIf} from '@angular/common';

@Component({
  selector: 'app-main',
  imports: [
    ContentCard
  ],
  templateUrl: './main.html',
  styleUrl: './main.sass',
})
export class Main implements OnInit {

  public dataList: any = [
    {
      "uuid": "12fbfed7-6c20-4538-bbca-eecaf5fea92e",
      "title": "How To Get To Heaven - Episode #1",
      "description": "This is a test of the How To Get To Heaven Show in which we do just that, guide souls to Heaven.",
      "uploadedOn": "2026-04-23T21:53:14.307322Z",
      "duration": 44.544,
      "filename": "2026-04-23-how-to-get-to-heaven---episode-#1.m4a"
    },
    {
      "uuid": "99a18dcb-3a72-4a46-bbe6-14461bf704b2",
      "title": "How To Get To Heaven - Episode #1",
      "description": "This is a test of the How To Get To Heaven Show in which we do just that, guide souls to Heaven.",
      "uploadedOn": "2026-04-23T20:21:39.330070Z",
      "duration": 44.544,
      "filename": "2026-04-23-how-to-get-to-heaven---episode-#1.m4a"
    },
    {
      "uuid": "12d85829-fa38-4bee-9f62-243c5d175b38",
      "title": "How To Get To Heaven - Episode #1",
      "description": "This is a test of the How To Get To Heaven Show in which we do just that, guide souls to Heaven.",
      "uploadedOn": "2026-04-23T19:46:05.695639Z",
      "duration": 44.544,
      "filename": "2026-04-23-how-to-get-to-heaven---episode-#1.m4a"
    },
    {
      "uuid": "4764a30c-57c7-4076-9a3b-5e6ab20ad49c",
      "title": "How To Get To Heaven - Episode #1",
      "description": "This is a test of the How To Get To Heaven Show in which we do just that, guide souls to Heaven.",
      "uploadedOn": "2026-04-23T18:35:38.124795Z",
      "duration": 44.544,
      "filename": "2026-04-23-how-to-get-to-heaven---episode-#1.m4a"
    }
  ]
  ;

  constructor(private http: HttpClient) {
    // this.http.get('http://localhost:8080/content')
    //   .subscribe((contentList : any) => {
    //     this.dataList = contentList;
    //     console.log(JSON.stringify(this.dataList));
    //   });
  }

  ngOnInit(): void {

  }

}
