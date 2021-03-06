import { CharacterService } from './../services/character.service';
import { Character } from './../models/character.model';
import { RoomService } from './../services/room.service';
import { Room } from './../models/room.model';
import { Settings } from '../../core/models/settings.model';
import { BoardActionTypes, SetupBoardCompleteAction, StartSessionAction, EndSessionAction, EliminateCharacterAction, GuessSuccessAction, GuessFailedAction, NavToLooseAction } from './../actions/board.action';
import { Injectable } from '@angular/core';
import { Effect, Actions } from '@ngrx/effects';
import { Action, Store } from '@ngrx/store';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { go } from '@ngrx/router-store';

@Injectable()
export class BoardEffects {

  @Effect()
  setupBoard$: Observable<Action> = this.actions$
    .ofType(BoardActionTypes.SETUP_BOARD)
    .map(action => action.payload)
    .withLatestFrom(this.store.select('system', 'settings'), (_, settings) => settings)
    .map((settings: Settings) => {
      let rooms: Room[] = this.room.generateRooms(settings.numberOfRooms),
          characters: Character[] = this.character.generateCharacters(settings.numberOfCharacters, rooms),
          numOfCharacter = characters.length,
          murderer: Character = characters[Math.floor(Math.random()*numOfCharacter)],
          murdererId = murderer.id;
      return new SetupBoardCompleteAction({ rooms, characters, murdererId, lives: settings.lives });
    })

  @Effect()
  startSession$: Observable<Action> = this.actions$
    .ofType(BoardActionTypes.SETUP_BOARD_COMPLETE)
    .map(action => action.payload)
    .map(_ => new StartSessionAction())
    .share()

  @Effect()
  endSession$: Observable<Action> = this.actions$
    .ofType(BoardActionTypes.START_SESSION)
    .map(action => action.payload)
    .withLatestFrom(this.store.select('system', 'settings'), (_, settings) => settings)
    .switchMap((settings: Settings) => {
        return Observable.timer(settings.sessionTime)
        .takeUntil(this.actions$.ofType(BoardActionTypes.GUESS_MURDERER))
    })
    .map(_ => new EndSessionAction())

  @Effect({ dispatch: false })
  navToSession$: Observable<Action> = this.actions$
    .ofType(BoardActionTypes.START_SESSION)
    .map(action => action.payload)
    .do(_ => this.router.navigate(['/board/rooms']))

  @Effect()
  eliminateCharacter$: Observable<Action> = this.actions$
    .ofType(BoardActionTypes.START_SESSION)
    .map(action => action.payload)
    .withLatestFrom(this.store.select('board'), (_, board) => board)
    .switchMap((board: {characters: Character[], murdererId: string}) => {
      let characters = board.characters,
          murdererId = board.murdererId,
          murderer = characters.find(char => char.id === murdererId);
      return Observable.interval(1000)
        .delay(Math.floor(1000+Math.random()*3000))
        .takeUntil(this.actions$.ofType(BoardActionTypes.GUESS_MURDERER))
        .map(_ => characters.filter(char => (char.roomId === murderer.roomId) && (char.id !== murderer.id)))
        // .filter(userInSameRoom => userInSameRoom.length > 0)
        .map(usersInSameRoom => {
          let eliminatedCharacter: Character;
          if (usersInSameRoom.length) {
            eliminatedCharacter = usersInSameRoom[Math.floor(Math.random()*usersInSameRoom.length)];
            return new EliminateCharacterAction({ eliminatedCharacterId: eliminatedCharacter.id });
          }
          return new EliminateCharacterAction({ eliminatedCharacterId: null })
        })
        .takeUntil(this.actions$.ofType(BoardActionTypes.END_SESSION).merge(this.actions$.ofType(BoardActionTypes.ELIMINATE_CHARACTER)
    .map(action => action.payload)))
    })

  @Effect({ dispatch: false })
  navToSessionEnd$: Observable<any> = this.actions$
    .ofType(BoardActionTypes.END_SESSION)
    .withLatestFrom(this.store.select('system', 'settings'), this.store.select('board', 'characters'), (_, settings, characters) => ({settings, characters}))
    .do(combined => {
      if (combined.settings['charactersToEndOfGame'] === combined.characters['length']) {
        this.router.navigate(['/board/loose-page']);
      } else {
        this.router.navigate(['/board/session-end']);
      }
    })

  @Effect()
  guessMurderer$: Observable<Action> = this.actions$
    .ofType(BoardActionTypes.GUESS_MURDERER)
    .map(action => action.payload.guessedId)
    .withLatestFrom(this.store.select('board', 'murdererId'), this.store.select('board', 'lives'),
        (guessedId, murdererId, lives) => ({ guessedRight: (guessedId === murdererId), lives}))
    .map(combined => {
      const lives: number = +combined.lives;
      if (combined.guessedRight) {
        return new GuessSuccessAction();
      } else {
        if (lives === 0) {
          return new NavToLooseAction();
        } else {
          return new GuessFailedAction();
        }
      }
    })

@Effect({ dispatch: false })
  navAfterLoose$: Observable<Action> = this.actions$
    .ofType(BoardActionTypes.NAV_TO_LOOSE)
    .do(_ => {
      this.router.navigate(['/board/loose-page'])
    })

@Effect({ dispatch: false })
  navToMainMenu$: Observable<Action> = this.actions$
    .ofType(BoardActionTypes.NAV_TO_MAIN_MENU)
    .do(_ => {
      this.router.navigate(['/main/main-menu'])
    })

@Effect({ dispatch: false })
  navAfterSuccess$: Observable<Action> = this.actions$
    .ofType(BoardActionTypes.GUESS_SUCCESS)
    .do(_ => {
      this.router.navigate(['/board/success-page'])
    })

@Effect({ dispatch: false })
  navAfterFailure$: Observable<Action> = this.actions$
    .ofType(BoardActionTypes.GUESS_FAILED)
    .do(_ => {
      this.router.navigate(['/board/session-end'])
    })

  


  constructor(
    private actions$: Actions, 
    private store: Store<any>,
    private router: Router,
    private room: RoomService,
    private character: CharacterService
  ) { }
}
