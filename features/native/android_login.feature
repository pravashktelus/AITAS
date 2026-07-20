@native @android
Feature: Native Android App — SwagLabs Login & Cart

  Background:
    Given I launch the app

  @smoke
  Scenario: Successful login on SwagLabs Android app
    When I enter 'standard_user' into native 'NativeAndroid.InputUsername'
    And I enter 'secret_sauce' into native 'NativeAndroid.InputPassword'
    And I tap native 'NativeAndroid.BtnLogin'
    Then native 'NativeAndroid.CartIcon' should be visible

  @negative
  Scenario: Login with invalid credentials shows error
    When I enter 'locked_out_user' into native 'NativeAndroid.InputUsername'
    And I enter 'secret_sauce' into native 'NativeAndroid.InputPassword'
    And I tap native 'NativeAndroid.BtnLogin'
    Then native 'NativeAndroid.ErrorMessage' should be visible

  @smoke
  Scenario: Add product to cart after login
    When I enter 'standard_user' into native 'NativeAndroid.InputUsername'
    And I enter 'secret_sauce' into native 'NativeAndroid.InputPassword'
    And I tap native 'NativeAndroid.BtnLogin'
    And I tap native 'NativeAndroid.BtnAddToCart'
    And I tap native 'NativeAndroid.CartIcon'
    Then native 'NativeAndroid.BtnCheckout' should be visible

  @gesture
  Scenario: Swipe through product list
    When I enter 'standard_user' into native 'NativeAndroid.InputUsername'
    And I enter 'secret_sauce' into native 'NativeAndroid.InputPassword'
    And I tap native 'NativeAndroid.BtnLogin'
    And I swipe 'up'
    Then native 'NativeAndroid.CartIcon' should be visible
