import {Component, Input} from '@angular/core';

@Component({
  selector: 'app-content-card',
  imports: [],
  templateUrl: './content-card.html',
  styleUrl: './content-card.sass',
})
export class ContentCard {

  @Input() public data: any;

}
