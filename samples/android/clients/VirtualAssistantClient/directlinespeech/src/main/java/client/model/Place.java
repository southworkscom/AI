/*
 * Microsoft Bot Connector API - v3.0
 * The Bot Connector REST API allows your bot to send and receive messages to channels configured in the  [Bot Framework Developer Portal](https://dev.botframework.com). The Connector service uses industry-standard REST  and JSON over HTTPS.    Client libraries for this REST API are available. See below for a list.    Many bots will use both the Bot Connector REST API and the associated [Bot State REST API](/en-us/restapi/state). The  Bot State REST API allows a bot to store and retrieve state associated with users and conversations.    Authentication for both the Bot Connector and Bot State REST APIs is accomplished with JWT Bearer tokens, and is  described in detail in the [Connector Authentication](/en-us/restapi/authentication) document.    # Client Libraries for the Bot Connector REST API    * [Bot Builder for C#](/en-us/csharp/builder/sdkreference/)  * [Bot Builder for Node.js](/en-us/node/builder/overview/)  * Generate your own from the [Connector API Swagger file](https://raw.githubusercontent.com/Microsoft/botbuilder-java/main/libraries/swagger/ConnectorAPI.json)    � 2016 Microsoft
 *
 * OpenAPI spec version: v3
 * Contact: botframework@microsoft.com
 *
 * NOTE: This class is auto generated by the swagger code generator program.
 * https://github.com/swagger-api/swagger-codegen.git
 * Do not edit the class manually.
 */


package client.model;

import com.google.gson.annotations.SerializedName;

import java.util.Objects;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;

/**
 * Place (entity type: \&quot;https://schema.org/Place\&quot;)
 */
@ApiModel(description = "Place (entity type: \"https://schema.org/Place\")")
@javax.annotation.Generated(value = "io.swagger.codegen.languages.JavaClientCodegen", date = "2018-08-29T10:06:15.114-07:00")
public class Place {
  @SerializedName("address")
  private Object address = null;

  @SerializedName("geo")
  private Object geo = null;

  @SerializedName("hasMap")
  private Object hasMap = null;

  @SerializedName("type")
  private String type = null;

  @SerializedName("name")
  private String name = null;

  public Place address(Object address) {
    this.address = address;
    return this;
  }

   /**
   * Address of the place (may be &#x60;string&#x60; or complex object of type &#x60;PostalAddress&#x60;)
   * @return address
  **/
  @ApiModelProperty(value = "Address of the place (may be `string` or complex object of type `PostalAddress`)")
  public Object getAddress() {
    return address;
  }

  public void setAddress(Object address) {
    this.address = address;
  }

  public Place geo(Object geo) {
    this.geo = geo;
    return this;
  }

   /**
   * Geo coordinates of the place (may be complex object of type &#x60;GeoCoordinates&#x60; or &#x60;GeoShape&#x60;)
   * @return geo
  **/
  @ApiModelProperty(value = "Geo coordinates of the place (may be complex object of type `GeoCoordinates` or `GeoShape`)")
  public Object getGeo() {
    return geo;
  }

  public void setGeo(Object geo) {
    this.geo = geo;
  }

  public Place hasMap(Object hasMap) {
    this.hasMap = hasMap;
    return this;
  }

   /**
   * Map to the place (may be &#x60;string&#x60; (URL) or complex object of type &#x60;Map&#x60;)
   * @return hasMap
  **/
  @ApiModelProperty(value = "Map to the place (may be `string` (URL) or complex object of type `Map`)")
  public Object getHasMap() {
    return hasMap;
  }

  public void setHasMap(Object hasMap) {
    this.hasMap = hasMap;
  }

  public Place type(String type) {
    this.type = type;
    return this;
  }

   /**
   * The type of the thing
   * @return type
  **/
  @ApiModelProperty(value = "The type of the thing")
  public String getType() {
    return type;
  }

  public void setType(String type) {
    this.type = type;
  }

  public Place name(String name) {
    this.name = name;
    return this;
  }

   /**
   * The name of the thing
   * @return name
  **/
  @ApiModelProperty(value = "The name of the thing")
  public String getName() {
    return name;
  }

  public void setName(String name) {
    this.name = name;
  }


  @Override
  public boolean equals(java.lang.Object o) {
    if (this == o) {
      return true;
    }
    if (o == null || getClass() != o.getClass()) {
      return false;
    }
    Place place = (Place) o;
    return Objects.equals(this.address, place.address) &&
        Objects.equals(this.geo, place.geo) &&
        Objects.equals(this.hasMap, place.hasMap) &&
        Objects.equals(this.type, place.type) &&
        Objects.equals(this.name, place.name);
  }

  @Override
  public int hashCode() {
    return Objects.hash(address, geo, hasMap, type, name);
  }


  @Override
  public String toString() {
    StringBuilder sb = new StringBuilder();
    sb.append("class Place {\n");

    sb.append("    address: ").append(toIndentedString(address)).append("\n");
    sb.append("    geo: ").append(toIndentedString(geo)).append("\n");
    sb.append("    hasMap: ").append(toIndentedString(hasMap)).append("\n");
    sb.append("    type: ").append(toIndentedString(type)).append("\n");
    sb.append("    name: ").append(toIndentedString(name)).append("\n");
    sb.append("}");
    return sb.toString();
  }

  /**
   * Convert the given object to string with each line indented by 4 spaces
   * (except the first line).
   */
  private String toIndentedString(java.lang.Object o) {
    if (o == null) {
      return "null";
    }
    return o.toString().replace("\n", "\n    ");
  }

}

