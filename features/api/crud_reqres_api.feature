@api @jsonplaceholder @crud
Feature: CRUD Operations — JSONPlaceholder Public API

  As an automation engineer
  I want to validate full CRUD lifecycle using a public REST API
  So that the framework's API testing capabilities are thoroughly demonstrated

  Background:
    Given I set the base url to 'https://jsonplaceholder.typicode.com'


  #########################################################
  # CREATE (POST)
  #########################################################

  @smoke @create
  Scenario: #01 Create a new post
    When I send a POST request to '/posts' with body:
      | key    | value                           |
      | title  | BDD Playwright Framework        |
      | body   | Automation testing at its best  |
      | userId | 1                               |
    Then the response status should be 201
    And the response body field 'title' should equal 'BDD Playwright Framework'
    And the response body field 'body' should equal 'Automation testing at its best'
    And the response body field 'id' should exist
    And I store the response body field 'id' as 'createdPostId'
    And the response time should be less than 5000ms

  @create
  Scenario: #02 Create post with random data
    When I send a POST request to '/posts' with body:
      | key    | value        |
      | title  | ##Company    |
      | body   | ##Address    |
      | userId | 1            |
    Then the response status should be 201
    And the response body field 'id' should exist
    And the response body field 'title' should not be empty


  #########################################################
  # READ (GET)
  #########################################################

  @smoke @read
  Scenario: #03 Get all posts
    When I send a GET request to '/posts'
    Then the response status should be 200
    And the response body field '0.id' should exist
    And the response body field '0.title' should not be empty
    And the response time should be less than 5000ms

  @read
  Scenario: #04 Get single post by ID
    When I send a GET request to '/posts/1'
    Then the response status should be 200
    And the response body field 'id' should equal '1'
    And the response body field 'userId' should equal '1'
    And the response body field 'title' should not be empty
    And the response body field 'body' should not be empty

  @read
  Scenario: #05 Get comments for a post
    When I send a GET request to '/posts/1/comments'
    Then the response status should be 200
    And the response body field '0.postId' should equal '1'
    And the response body field '0.email' should not be empty

  @read @negative
  Scenario: #06 Get non-existent post returns 404
    When I send a GET request to '/posts/99999'
    Then the response status should be 404


  #########################################################
  # UPDATE (PUT & PATCH)
  #########################################################

  @smoke @update
  Scenario: #07 Full update post with PUT
    When I send a PUT request to '/posts/1' with body:
      | key    | value                  |
      | title  | Updated Title          |
      | body   | Updated body content   |
      | userId | 1                      |
    Then the response status should be 200
    And the response body field 'title' should equal 'Updated Title'
    And the response body field 'body' should equal 'Updated body content'

  @update
  Scenario: #08 Partial update post with PATCH
    When I send a PATCH request to '/posts/1' with body:
      | key   | value                    |
      | title | Patched Title Only       |
    Then the response status should be 200
    And the response body field 'title' should equal 'Patched Title Only'


  #########################################################
  # DELETE
  #########################################################

  @smoke @delete
  Scenario: #09 Delete a post
    When I send a DELETE request to '/posts/1'
    Then the response status should be 200


  #########################################################
  # E2E CRUD LIFECYCLE (Single scenario)
  #########################################################

  @smoke @e2e @crud-lifecycle
  Scenario: #10 Complete CRUD lifecycle — Create, Read, Update, Delete
    # ─── Step 1: CREATE a new post ─────────────────────────────────────────
    When I send a POST request to '/posts' with body:
      | key    | value                          |
      | title  | E2E Lifecycle Test Post        |
      | body   | Created by BDD framework       |
      | userId | 1                              |
    Then the response status should be 201
    And the response body field 'title' should equal 'E2E Lifecycle Test Post'
    And the response body field 'id' should exist
    And I store the response body field 'id' as 'postId'

    # ─── Step 2: READ the created post ─────────────────────────────────────
    When I send a GET request to '/posts/1'
    Then the response status should be 200
    And the response body field 'id' should exist
    And the response body field 'title' should not be empty

    # ─── Step 3: UPDATE the post (PUT — full replace) ──────────────────────
    When I send a PUT request to '/posts/1' with body:
      | key    | value                          |
      | title  | E2E Updated Post               |
      | body   | Modified by automation suite   |
      | userId | 1                              |
    Then the response status should be 200
    And the response body field 'title' should equal 'E2E Updated Post'
    And the response body field 'body' should equal 'Modified by automation suite'

    # ─── Step 4: PATCH the post (partial update) ───────────────────────────
    When I send a PATCH request to '/posts/1' with body:
      | key   | value                   |
      | title | E2E Final Patched Title |
    Then the response status should be 200
    And the response body field 'title' should equal 'E2E Final Patched Title'

    # ─── Step 5: DELETE the post ───────────────────────────────────────────
    When I send a DELETE request to '/posts/1'
    Then the response status should be 200


  #########################################################
  # USERS ENDPOINTS
  #########################################################

  @smoke @users
  Scenario: #11 Get all users
    When I send a GET request to '/users'
    Then the response status should be 200
    And the response body field '0.name' should not be empty
    And the response body field '0.email' should not be empty
    And the response body field '0.address.city' should not be empty

  @users
  Scenario: #12 Get single user
    When I send a GET request to '/users/1'
    Then the response status should be 200
    And the response body field 'id' should equal '1'
    And the response body field 'name' should equal 'Leanne Graham'
    And the response body field 'email' should equal 'Sincere@april.biz'
    And the response body field 'phone' should not be empty

  @users
  Scenario: #13 Get user's posts (nested resource)
    When I send a GET request to '/users/1/posts'
    Then the response status should be 200
    And the response body field '0.userId' should equal '1'
    And the response body field '0.title' should not be empty


  #########################################################
  # TODOS & ALBUMS
  #########################################################

  @smoke @todos
  Scenario: #14 Get all todos
    When I send a GET request to '/todos'
    Then the response status should be 200
    And the response body field '0.title' should not be empty
    And the response body field '0.completed' should exist

  @todos
  Scenario: #15 Get completed todos for user 1
    When I send a GET request to '/todos?userId=1&completed=true'
    Then the response status should be 200

  @albums
  Scenario: #16 Get all albums
    When I send a GET request to '/albums'
    Then the response status should be 200
    And the response body field '0.title' should not be empty
    And the response body field '0.userId' should exist

  @albums
  Scenario: #17 Get photos for album 1
    When I send a GET request to '/albums/1/photos'
    Then the response status should be 200
    And the response body field '0.albumId' should equal '1'
    And the response body field '0.url' should not be empty
    And the response body field '0.thumbnailUrl' should not be empty


  #########################################################
  # RESPONSE TIME ASSERTIONS
  #########################################################

  @performance
  Scenario: #18 API response time is within acceptable limit
    When I send a GET request to '/posts/1'
    Then the response status should be 200
    And the response time should be less than 2000ms
