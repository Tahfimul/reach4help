/* eslint no-underscore-dangle: 0 */
import { IsObject, IsString } from 'class-validator';

export interface IUserAddress {
  address1?: string;
  address2?: string;
  postalCode?: string;
  city?: string;
  state?: string;
  country?: string;
  coords?: firebase.firestore.GeoPoint;
}

export interface IPrivilegedUserInformation
  extends firebase.firestore.DocumentData {
  addressFromGoogle: google.maps.GeocoderResult;
  address: IUserAddress;
  termsAccepted: firebase.firestore.Timestamp; // acts as a timestamp of when and as a boolean: if accepted it exists.
  termsVersion: string;
  privacyAccepted: firebase.firestore.Timestamp; // acts as a timestamp of when and as a boolean: if accepted it exists.
  privacyVersion: string;
}

export class PrivilegedUserInformation implements IPrivilegedUserInformation {
  constructor(
    addressFromGoogle: google.maps.GeocoderResult,
    address: IUserAddress,
    privacyAccepted: firebase.firestore.Timestamp,
    privacyVersion: string,
    termsAccepted: firebase.firestore.Timestamp,
    termsVersion: string,
  ) {
    this._addressFromGoogle = addressFromGoogle;
    this._address = address;
    this._privacyAccepted = privacyAccepted;
    this._privacyVersion = privacyVersion;
    this._termsAccepted = termsAccepted;
    this._termsVersion = termsVersion;
  }

  @IsObject()
  private _addressFromGoogle: google.maps.GeocoderResult;

  get addressFromGoogle(): google.maps.GeocoderResult {
    return this._addressFromGoogle;
  }

  set addressFromGoogle(value: google.maps.GeocoderResult) {
    this._addressFromGoogle = value;
  }

  @IsObject()
  private _address: IUserAddress;

  get address(): IUserAddress {
    return this._address;
  }

  set address(value: IUserAddress) {
    this._address = value;
  }

  @IsObject()
  private _privacyAccepted: firebase.firestore.Timestamp;

  get privacyAccepted(): firebase.firestore.Timestamp {
    return this._privacyAccepted;
  }

  set privacyAccepted(value: firebase.firestore.Timestamp) {
    this._privacyAccepted = value;
  }

  @IsString()
  private _privacyVersion: string;

  get privacyVersion(): string {
    return this._privacyVersion;
  }

  set privacyVersion(value: string) {
    this._privacyVersion = value;
  }

  @IsObject()
  private _termsAccepted: firebase.firestore.Timestamp;

  get termsAccepted(): firebase.firestore.Timestamp {
    return this._termsAccepted;
  }

  set termsAccepted(value: firebase.firestore.Timestamp) {
    this._termsAccepted = value;
  }

  @IsString()
  private _termsVersion: string;

  get termsVersion(): string {
    return this._termsVersion;
  }

  set termsVersion(value: string) {
    this._termsVersion = value;
  }

  static factory = (
    data: IPrivilegedUserInformation,
  ): PrivilegedUserInformation =>
    new PrivilegedUserInformation(
      data.addressFromGoogle,
      data.address,
      data.privacyAccepted,
      data.privacyVersion,
      data.termsAccepted,
      data.termsVersion,
    );

  toObject(): object {
    return {
      addressFromGoogle: this.addressFromGoogle,
      address: this.address,
      privacyAccepted: this.privacyAccepted,
      privacyVersion: this.privacyVersion,
      termsAccepted: this.termsAccepted,
      termsVersion: this.termsVersion,
    };
  }
}

export const PrivilegedUserInformationFirestoreConverter: firebase.firestore.FirestoreDataConverter<PrivilegedUserInformation> = {
  fromFirestore: (
    data: firebase.firestore.QueryDocumentSnapshot<IPrivilegedUserInformation>,
  ): PrivilegedUserInformation =>
    PrivilegedUserInformation.factory(data.data()),
  toFirestore: (
    modelObject: PrivilegedUserInformation,
  ): firebase.firestore.DocumentData => ({
    addressFromGoogle: JSON.parse(
      JSON.stringify(modelObject.addressFromGoogle),
    ),
    address: modelObject.address,
    privacyAccepted: modelObject.privacyAccepted,
    privacyVersion: modelObject.privacyVersion,
    termsAccepted: modelObject.termsAccepted,
    termsVersion: modelObject.termsVersion,
  }),
};
