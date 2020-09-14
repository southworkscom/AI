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
 * Indicates what the payment request is for and the value asked for
 */
@ApiModel(description = "Indicates what the payment request is for and the value asked for")
@javax.annotation.Generated(value = "io.swagger.codegen.languages.JavaClientCodegen", date = "2018-08-29T10:06:15.114-07:00")
public class PaymentItem {
  @SerializedName("label")
  private String label = null;

  @SerializedName("amount")
  private PaymentCurrencyAmount amount = null;

  @SerializedName("pending")
  private Boolean pending = null;

  public PaymentItem label(String label) {
    this.label = label;
    return this;
  }

   /**
   * Human-readable description of the item
   * @return label
  **/
  @ApiModelProperty(value = "Human-readable description of the item")
  public String getLabel() {
    return label;
  }

  public void setLabel(String label) {
    this.label = label;
  }

  public PaymentItem amount(PaymentCurrencyAmount amount) {
    this.amount = amount;
    return this;
  }

   /**
   * Monetary amount for the item
   * @return amount
  **/
  @ApiModelProperty(value = "Monetary amount for the item")
  public PaymentCurrencyAmount getAmount() {
    return amount;
  }

  public void setAmount(PaymentCurrencyAmount amount) {
    this.amount = amount;
  }

  public PaymentItem pending(Boolean pending) {
    this.pending = pending;
    return this;
  }

   /**
   * When set to true this flag means that the amount field is not final.
   * @return pending
  **/
  @ApiModelProperty(value = "When set to true this flag means that the amount field is not final.")
  public Boolean isPending() {
    return pending;
  }

  public void setPending(Boolean pending) {
    this.pending = pending;
  }


  @Override
  public boolean equals(java.lang.Object o) {
    if (this == o) {
      return true;
    }
    if (o == null || getClass() != o.getClass()) {
      return false;
    }
    PaymentItem paymentItem = (PaymentItem) o;
    return Objects.equals(this.label, paymentItem.label) &&
        Objects.equals(this.amount, paymentItem.amount) &&
        Objects.equals(this.pending, paymentItem.pending);
  }

  @Override
  public int hashCode() {
    return Objects.hash(label, amount, pending);
  }


  @Override
  public String toString() {
    StringBuilder sb = new StringBuilder();
    sb.append("class PaymentItem {\n");

    sb.append("    label: ").append(toIndentedString(label)).append("\n");
    sb.append("    amount: ").append(toIndentedString(amount)).append("\n");
    sb.append("    pending: ").append(toIndentedString(pending)).append("\n");
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

