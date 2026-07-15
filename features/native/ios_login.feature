@native @ios
Feature: Native iOS App — SwagLabs Login

  Background:
    Given I launch the app

  @smoke
  Scenario: Successful login on iOS app
    When I enter 'standard_user' into native 'NativeIOS.InputUsername'
    And I enter 'secret_sauce' into native 'NativeIOS.InputPassword'
    And I tap native 'NativeIOS.BtnLogin'
    Then native 'NativeIOS.CartIcon' should be visible

  @negative
  Scenario: Login with invalid credentials shows error on iOS
    When I enter 'locked_out_user' into native 'NativeIOS.InputUsername'
    And I enter 'secret_sauce' into native 'NativeIOS.InputPassword'
    And I tap native 'NativeIOS.BtnLogin'
    Then native 'NativeIOS.ErrorMessage' should be visible

  @smoke
  Scenario: Add product to cart on iOS
    When I enter 'standard_user' into native 'NativeIOS.InputUsername'
    And I enter 'secret_sauce' into native 'NativeIOS.InputPassword'
    And I tap native 'NativeIOS.BtnLogin'
    And I tap native 'NativeIOS.BtnAddToCart'
    Then native 'NativeIOS.CartIcon' should be visible
